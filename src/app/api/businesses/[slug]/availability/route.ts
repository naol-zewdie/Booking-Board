import { NextResponse } from "next/server";
import db from "@/lib/db";
import { availabilityQuerySchema } from "@/lib/validations/appointment";
import { generateSlots, BookableSlot } from "@/lib/availability/engine";

interface RouteParams {
  params: { slug: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = {
      serviceId: searchParams.get("serviceId") || "",
      date: searchParams.get("date") || "",
      staffId: searchParams.get("staffId") || undefined,
    };

    const validatedQuery = availabilityQuerySchema.parse(rawQuery);

    // 1. Fetch Business
    const business = await db.business.findUnique({
      where: { slug: params.slug },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // 2. Fetch Service
    const service = await db.service.findFirst({
      where: {
        id: validatedQuery.serviceId,
        businessId: business.id,
        active: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    // 3. Fetch Staff Members who perform this service (specific staff or all eligible active staff)
    const staffQuery: any = {
      businessId: business.id,
      active: true,
      OR: [
        { staffServices: { some: { serviceId: service.id } } },
        { staffServices: { none: {} } }, // fallback if business hasn't restricted staff services
      ],
    };

    if (validatedQuery.staffId && validatedQuery.staffId !== "any") {
      staffQuery.id = validatedQuery.staffId;
    }

    const staffMembers = await db.staff.findMany({
      where: staffQuery,
      include: {
        workingHours: true,
        timeOff: true,
        appointments: {
          where: {
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
          },
          include: {
            service: true,
          },
        },
      },
    });

    if (staffMembers.length === 0) {
      return NextResponse.json({
        date: validatedQuery.date,
        timezone: business.timezone,
        service: {
          id: service.id,
          name: service.name,
          durationMin: service.durationMin,
          priceCents: service.priceCents,
          bufferMin: service.bufferMin,
        },
        slots: [],
      });
    }

    // 4. Generate slots for each staff member and combine
    const allSlots: BookableSlot[] = [];

    for (const staff of staffMembers) {
      const existingAppointments = staff.appointments.map((apt: any) => ({
        startsAt: apt.startsAt,
        endsAt: apt.endsAt,
        bufferMin: apt.service?.bufferMin || 0,
      }));

      const staffSlots = generateSlots({
        workingHours: staff.workingHours,
        timeOff: staff.timeOff,
        existingAppointments,
        service: {
          durationMin: service.durationMin,
          bufferMin: service.bufferMin,
        },
        dateStr: validatedQuery.date,
        businessTz: business.timezone,
        slotGranularityMin: 15,
        minNoticeMin: 120, // 2 hours minimum notice
        staffId: staff.id,
        staffName: staff.name,
      });

      allSlots.push(...staffSlots);
    }

    // 5. Sort slots chronologically
    allSlots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    return NextResponse.json({
      date: validatedQuery.date,
      timezone: business.timezone,
      service: {
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        bufferMin: service.bufferMin,
      },
      slots: allSlots,
    });
  } catch (error: any) {
    console.error("Error generating availability slots:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to generate availability" }, { status: 500 });
  }
}
