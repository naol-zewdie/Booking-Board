import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { createAppointmentSchema } from "@/lib/validations/appointment";
import { generateSlots } from "@/lib/availability/engine";
import { generateAppointmentToken } from "@/lib/auth/tokens";
import { dispatchBookingConfirmation } from "@/lib/notifications/service";
import { enqueueAppointmentReminders } from "@/lib/queue/reminderQueue";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { enqueuePaymentTimeout } from "@/lib/queue/paymentTimeoutQueue";
import { isExclusionOrCollisionError } from "@/lib/utils";

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
    const business: any = await (db as any).business.findUnique({
      where: { slug: params.slug },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // 2. Fetch Service
    const service: any = await (db as any).service.findFirst({
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
    const requiresPayment = service.paymentRequirement === "DEPOSIT" || service.paymentRequirement === "FULL";
    const initialStatus = requiresPayment ? "PENDING_PAYMENT" : "CONFIRMED";

    // 3. Atomic Transaction for Collision Prevention & Booking Creation
    const result = await db.$transaction(async (tx: any) => {
      let targetStaffId = validatedData.staffId;

      // If no specific staffId provided, find the first available active staff member who performs this service
      if (!targetStaffId || targetStaffId === "any") {
        const activeStaffList = await tx.staff.findMany({
          where: {
            businessId: business.id,
            active: true,
            OR: [
              { staffServices: { some: { serviceId: service.id } } },
              { staffServices: { none: {} } },
            ],
          },
          include: {
            workingHours: true,
            timeOff: true,
            appointments: {
              where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
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
        // Verify target staff belongs to business, is active, and is qualified for this service
        const staff = await tx.staff.findFirst({
          where: {
            id: targetStaffId,
            businessId: business.id,
            active: true,
            OR: [
              { staffServices: { some: { serviceId: service.id } } },
              { staffServices: { none: {} } },
            ],
          },
          include: {
            workingHours: true,
            timeOff: true,
            appointments: {
              where: { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
              include: { service: true },
            },
          },
        });

        if (!staff) {
          throw new Error("STAFF_NOT_FOUND");
        }

        // Check collision against existing confirmed & pending payment appointments
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
      let customer = await tx.customer.findFirst({
        where: {
          businessId: business.id,
          OR: [
            ...(validatedData.customer.email ? [{ email: validatedData.customer.email }] : []),
            ...(validatedData.customer.phone ? [{ phone: validatedData.customer.phone }] : []),
          ],
        },
      });

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
        // Update customer name/phone if provided
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: validatedData.customer.name,
            phone: validatedData.customer.phone || customer.phone,
          },
        });
      }

      // 5. Create Appointment in UTC with initial status (PENDING_PAYMENT if paid, CONFIRMED if unpaid)
      const appointment = await tx.appointment.create({
        data: {
          businessId: business.id,
          staffId: targetStaffId!,
          serviceId: service.id,
          customerId: customer.id,
          startsAt: requestedStart,
          endsAt: requestedEnd,
          status: initialStatus,
          paymentStatus: "NONE",
          paidAmountCents: 0,
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

    // 4. Post-Commit Flow Branching: Paid Services vs Unpaid Services
    if (requiresPayment) {
      // A. Enqueue 15-Minute Reservation Expiry Job
      await enqueuePaymentTimeout(result.id, 15);

      // B. Generate Stripe Checkout Session
      const checkoutSession = await createCheckoutSession({
        appointmentId: result.id,
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          currency: business.currency,
        },
        service: {
          name: result.service.name,
          durationMin: result.service.durationMin,
          priceCents: result.service.priceCents,
          paymentRequirement: result.service.paymentRequirement as any,
          depositAmountCents: result.service.depositAmountCents,
        },
        customer: {
          name: result.customer.name,
          email: result.customer.email,
        },
        startsAt: result.startsAt,
      });

      return NextResponse.json(
        {
          success: true,
          appointment: result,
          requiresPayment: true,
          checkoutUrl: checkoutSession.checkoutUrl,
          sessionId: checkoutSession.sessionId,
          amountCents: checkoutSession.amountCents,
          paymentType: checkoutSession.paymentType,
        },
        { status: 201 }
      );
    }

    // Unpaid / Free Service: Post-Commit Notifications
    try {
      const cancellationToken = generateAppointmentToken({
        appointmentId: result.id,
        businessId: business.id,
        startsAt: result.startsAt,
      });

      if (result.customer?.email) {
        await dispatchBookingConfirmation({
          business: {
            id: business.id,
            name: business.name,
            slug: business.slug,
            timezone: business.timezone,
            currency: business.currency,
          },
          appointment: {
            id: result.id,
            startsAt: result.startsAt,
            endsAt: result.endsAt,
            notes: result.notes,
          },
          service: {
            name: result.service.name,
            durationMin: result.service.durationMin,
            priceCents: result.service.priceCents,
          },
          staff: {
            name: result.staff.name,
            role: result.staff.role,
          },
          customer: {
            name: result.customer.name,
            email: result.customer.email,
            phone: result.customer.phone,
          },
          cancellationToken,
        });
      }

      // Enqueue scheduled reminders (skips negative delays automatically)
      await enqueueAppointmentReminders({
        appointmentId: result.id,
        businessId: business.id,
        startsAt: result.startsAt,
      });
    } catch (notifErr) {
      console.warn("⚠️ Best-effort notification delivery error (booking creation unaffected):", notifErr);
    }

    return NextResponse.json({ success: true, appointment: result, requiresPayment: false }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating appointment:", error);

    // Translate application collisions, PostgreSQL 23P01 exclusion violations, and Prisma P2002/P2010 into 409 Conflict
    if (isExclusionOrCollisionError(error)) {
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
