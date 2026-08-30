import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { createAppointmentSchema } from "@/lib/validations/appointment";
import { generateSlots } from "@/lib/availability/engine";

interface RouteParams {
  params: { slug: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const validatedData = createAppointmentSchema.parse(body);

    const requestedStart = new Date(validatedData.startsAt);
    if (isNaN(requestedStart.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt datetime" }, { status: 400 });
    }

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
        id: validatedData.serviceId,
        businessId: business.id,
        active: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });
    }

    const requestedEnd = addMinutes(requestedStart, service.durationMin);

    // 3. Atomic Transaction for Collision Prevention & Booking Creation
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      let targetStaffId = validatedData.staffId;

      // If no specific staffId provided, find the first available active staff member
      if (!targetStaffId || targetStaffId === "any") {
        const activeStaffList = await tx.staff.findMany({
          where: { businessId: business.id, active: true },
          include: {
            workingHours: true,
            timeOff: true,
            appointments: {
              where: { status: "CONFIRMED" },
              include: { service: true },
            },
          },
        });

        // Format target date YYYY-MM-DD in business timezone
        const dateStr = requestedStart.toISOString().split("T")[0];

        let chosenStaff = null;
        for (const st of activeStaffList) {
          const slots = generateSlots({
            workingHours: st.workingHours,
            timeOff: st.timeOff,
            existingAppointments: st.appointments.map((a: any) => ({
              startsAt: a.startsAt,
              endsAt: a.endsAt,
              bufferMin: a.service?.bufferMin || 0,
            })),
            service: {
              durationMin: service.durationMin,
              bufferMin: service.bufferMin,
            },
            dateStr,
            businessTz: business.timezone,
            slotGranularityMin: 5,
            minNoticeMin: 0, // already validated at submission time
            staffId: st.id,
          });

          const isSlotAvailable = slots.some(
            (s) => s.startsAt.getTime() === requestedStart.getTime()
          );

          if (isSlotAvailable) {
            chosenStaff = st;
            break;
          }
        }

        if (!chosenStaff) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        targetStaffId = chosenStaff.id;
      } else {
        // Verify target staff belongs to business and is active
        const staff = await tx.staff.findFirst({
          where: {
            id: targetStaffId,
            businessId: business.id,
            active: true,
          },
          include: {
            workingHours: true,
            timeOff: true,
            appointments: {
              where: { status: "CONFIRMED" },
              include: { service: true },
            },
          },
        });

        if (!staff) {
          throw new Error("STAFF_NOT_FOUND");
        }

        // Check collision against existing confirmed appointments
        // Range overlap condition: requestedStart < existingEnd && requestedEnd > existingStart
        const overlappingAppointments = staff.appointments.filter((apt: any) => {
          const aptBuffer = apt.service?.bufferMin || 0;
          const aptEndWithBuffer = addMinutes(apt.endsAt, aptBuffer);

          return (
            requestedStart.getTime() < aptEndWithBuffer.getTime() &&
            requestedEnd.getTime() > apt.startsAt.getTime()
          );
        });

        if (overlappingAppointments.length > 0) {
          throw new Error("SLOT_UNAVAILABLE");
        }

        // Check collision against time off
        const overlappingTimeOff = staff.timeOff.filter((to: any) => {
          return (
            requestedStart.getTime() < to.endsAt.getTime() &&
            requestedEnd.getTime() > to.startsAt.getTime()
          );
        });

        if (overlappingTimeOff.length > 0) {
          throw new Error("SLOT_UNAVAILABLE");
        }
      }

      // 4. Find or create customer
      let customer = null;
      if (validatedData.customer.email) {
        customer = await tx.customer.findFirst({
          where: {
            businessId: business.id,
            email: validatedData.customer.email,
          },
        });
      } else if (validatedData.customer.phone) {
        customer = await tx.customer.findFirst({
          where: {
            businessId: business.id,
            phone: validatedData.customer.phone,
          },
        });
      }

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            businessId: business.id,
            name: validatedData.customer.name,
            email: validatedData.customer.email || null,
            phone: validatedData.customer.phone || null,
          },
        });
      } else {
        // Update customer name if provided
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: validatedData.customer.name,
            phone: validatedData.customer.phone || customer.phone,
          },
        });
      }

      // 5. Create Appointment in UTC
      const appointment = await tx.appointment.create({
        data: {
          businessId: business.id,
          staffId: targetStaffId!,
          serviceId: service.id,
          customerId: customer.id,
          startsAt: requestedStart,
          endsAt: requestedEnd,
          status: "CONFIRMED",
          paymentStatus: "NONE",
          notes: validatedData.notes || null,
        },
        include: {
          service: true,
          staff: true,
          customer: true,
        },
      });

      return appointment;
    });

    return NextResponse.json({ success: true, appointment: result }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating appointment:", error);

    if (error.message === "SLOT_UNAVAILABLE") {
      return NextResponse.json(
        {
          error: "That slot was just taken by another booking. Please choose another time.",
          conflict: true,
        },
        { status: 409 }
      );
    }

    if (error.message === "STAFF_NOT_FOUND") {
      return NextResponse.json({ error: "Selected specialist not found or inactive" }, { status: 404 });
    }

    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ error: error.message || "Failed to book appointment" }, { status: 500 });
  }
}
