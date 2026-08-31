import { NextResponse } from "next/server";
import db from "@/lib/db";
import { generateAppointmentToken } from "@/lib/auth/tokens";
import { dispatchBookingConfirmation } from "@/lib/notifications/service";
import { enqueueAppointmentReminders } from "@/lib/queue/reminderQueue";
import { cancelPaymentTimeout } from "@/lib/queue/paymentTimeoutQueue";

export async function POST(req: Request) {
  try {
    const event = await req.json();

    if (!event || !event.id || !event.type) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // Handle checkout.session.completed and payment_intent.succeeded
    if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const dataObj = event.data?.object || {};
      const appointmentId =
        dataObj.client_reference_id ||
        dataObj.metadata?.appointmentId ||
        event.appointmentId;

      if (!appointmentId) {
        return NextResponse.json({ received: true, ignored: "Missing appointmentId in metadata" });
      }

      const amountPaidCents = dataObj.amount_total || dataObj.amount || event.amountPaidCents || 0;
      const paymentIntentId = dataObj.payment_intent || dataObj.id || event.paymentIntentId || `pi_test_${appointmentId}`;
      const paymentType = dataObj.metadata?.paymentType || event.paymentType || "FULL";
      const targetPaymentStatus = paymentType === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID";

      // 1. Single Atomic Transaction: Idempotency + State Transition
      const result = await db.$transaction(async (tx: any) => {
        // Idempotency check
        const existingEvent = await tx.webhookEvent.findUnique({
          where: { id: event.id },
        });

        if (existingEvent) {
          console.log(`🔁 [WEBHOOK IDEMPOTENT NO-OP] Event ${event.id} already processed`);
          return { duplicate: true };
        }

        // Fetch current appointment
        const appointment = await tx.appointment.findUnique({
          where: { id: appointmentId },
        });

        if (!appointment) {
          return { duplicate: false, notFound: true };
        }

        // Update appointment to CONFIRMED
        const updated = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "CONFIRMED",
            paymentStatus: targetPaymentStatus,
            paidAmountCents: amountPaidCents,
            stripePaymentIntentId: paymentIntentId,
          },
          include: {
            service: true,
            staff: true,
            customer: true,
            business: true,
          },
        });

        // Record processed event in the same transaction
        await tx.webhookEvent.create({
          data: {
            id: event.id,
            type: event.type,
          },
        });

        return { duplicate: false, appointment: updated };
      });

      if (result.duplicate) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }

      if (result.notFound || !result.appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      // 2. Cancel 15-minute hold timeout
      await cancelPaymentTimeout(appointmentId);

      // 3. Post-Commit Best-Effort Notification Dispatch
      const apt = result.appointment;
      try {
        const cancellationToken = generateAppointmentToken({
          appointmentId: apt.id,
          businessId: apt.businessId,
          startsAt: apt.startsAt,
        });

        if (apt.customer?.email) {
          await dispatchBookingConfirmation({
            business: {
              id: apt.business.id,
              name: apt.business.name,
              slug: apt.business.slug,
              timezone: apt.business.timezone,
              currency: apt.business.currency,
            },
            appointment: {
              id: apt.id,
              startsAt: apt.startsAt,
              endsAt: apt.endsAt,
              notes: apt.notes,
            },
            service: {
              name: apt.service.name,
              durationMin: apt.service.durationMin,
              priceCents: apt.service.priceCents,
            },
            staff: {
              name: apt.staff.name,
              role: apt.staff.role,
            },
            customer: {
              name: apt.customer.name,
              email: apt.customer.email,
              phone: apt.customer.phone,
            },
            cancellationToken,
          });
        }

        await enqueueAppointmentReminders({
          appointmentId: apt.id,
          businessId: apt.businessId,
          startsAt: apt.startsAt,
        });
      } catch (notifErr) {
        console.warn("⚠️ Non-fatal webhook notification delivery error:", notifErr);
      }

      return NextResponse.json({ received: true, success: true }, { status: 200 });
    }

    return NextResponse.json({ received: true, unhandled: event.type }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
