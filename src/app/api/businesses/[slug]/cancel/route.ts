import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { verifyAppointmentToken } from "@/lib/auth/tokens";
import { canTransition } from "@/lib/appointments/stateMachine";
import { cancelAppointmentReminders } from "@/lib/queue/reminderQueue";
import { dispatchCancellationNotification } from "@/lib/notifications/service";
import { createStripeRefund } from "@/lib/payments/stripe";

interface RouteParams {
  params: { slug: string };
}

const cancelRequestSchema = z.object({
  token: z.string().min(1, "Cancellation token is required"),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const { token, reason } = cancelRequestSchema.parse(body);

    // 1. Fetch Business
    const business: any = await (db as any).business.findUnique({
      where: { slug: params.slug },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // 2. Cryptographic Token Verification
    const verification = verifyAppointmentToken(token, business.id);
    if (!verification.valid) {
      const statusCode =
        verification.reason === "EXPIRED"
          ? 410
          : verification.reason === "MISMATCHED_BUSINESS"
          ? 403
          : 401;

      return NextResponse.json(
        { error: verification.message, reason: verification.reason },
        { status: statusCode }
      );
    }

    const { appointmentId } = verification.payload;

    // 3. Fetch Appointment
    const appointment: any = await (db as any).appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // 4. Policy Check: Minimum Cancellation Notice Window
    const minNoticeHours = business.cancellationNoticeHours || 2;
    const minNoticeMs = minNoticeHours * 60 * 60 * 1000;
    const timeUntilStartMs = appointment.startsAt.getTime() - Date.now();

    if (timeUntilStartMs < minNoticeMs) {
      return NextResponse.json(
        {
          error: `Online cancellation is not available within ${minNoticeHours} hours of your appointment start time. Please contact the business directly to make adjustments.`,
          policyCutoff: true,
        },
        { status: 400 }
      );
    }

    // 5. State Machine Transition Verification
    if (appointment.status === "CANCELLED") {
      return NextResponse.json(
        {
          error: "This appointment has already been cancelled.",
          alreadyCancelled: true,
        },
        { status: 400 }
      );
    }

    if (!canTransition(appointment.status, "CANCELLED")) {
      return NextResponse.json(
        {
          error: `Unable to cancel: Appointment is in status '${appointment.status}' and cannot be cancelled.`,
        },
        { status: 400 }
      );
    }

    // 6. Automated Refund Eligibility Check
    const refundNoticeHours = business.refundNoticeHours || 24;
    const refundNoticeMs = refundNoticeHours * 60 * 60 * 1000;
    const isEligibleForRefund =
      timeUntilStartMs >= refundNoticeMs &&
      appointment.paidAmountCents > 0 &&
      Boolean(appointment.stripePaymentIntentId) &&
      appointment.paymentStatus !== "REFUNDED";

    let refundResult = null;
    let newPaymentStatus = appointment.paymentStatus;
    let stripeRefundId = appointment.stripeRefundId;

    if (isEligibleForRefund && appointment.stripePaymentIntentId) {
      refundResult = await createStripeRefund({
        paymentIntentId: appointment.stripePaymentIntentId,
        amountCents: appointment.paidAmountCents,
        reason: `Customer cancellation >= ${refundNoticeHours}h policy notice`,
      });
      newPaymentStatus = "REFUNDED";
      stripeRefundId = refundResult.refundId;
    }

    // 7. Transition Appointment to CANCELLED with attribution & payment updates
    const updated: any = await (db as any).appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "CUSTOMER",
        cancellationReason: reason || "Customer self-service online cancellation",
        paymentStatus: newPaymentStatus,
        stripeRefundId: stripeRefundId,
        notes: reason
          ? `${appointment.notes ? appointment.notes + " | " : ""}Customer Cancellation Reason: ${reason}`
          : appointment.notes,
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });

    // 8. Layer 1: Eager Reminder Queue Cleanup
    await cancelAppointmentReminders(appointmentId);

    // 9. Dispatch Cancellation Confirmation Email
    if (updated.customer?.email) {
      try {
        await dispatchCancellationNotification({
          business: {
            id: business.id,
            name: business.name,
            slug: business.slug,
            timezone: business.timezone,
            currency: business.currency,
          },
          appointment: {
            id: updated.id,
            startsAt: updated.startsAt,
            endsAt: updated.endsAt,
          },
          service: {
            name: updated.service.name,
            durationMin: updated.service.durationMin,
            priceCents: updated.service.priceCents,
          },
          staff: {
            name: updated.staff.name,
            role: updated.staff.role,
          },
          customer: {
            name: updated.customer.name,
            email: updated.customer.email,
          },
          cancellationToken: token,
        });
      } catch (err) {
        console.warn("⚠️ Non-fatal error sending cancellation email:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: isEligibleForRefund
        ? "Your appointment has been cancelled and a full refund has been issued."
        : "Your appointment has been cancelled.",
      refundIssued: isEligibleForRefund,
      refundAmountCents: isEligibleForRefund ? appointment.paidAmountCents : 0,
      appointment: updated,
    });
  } catch (error: any) {
    console.error("Error cancelling appointment:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Invalid cancellation request" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to cancel appointment" }, { status: 500 });
  }
}
