import { NextResponse } from "next/server";
import db from "@/lib/db";
import { createStripeRefund } from "@/lib/payments/stripe";

interface RouteParams {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const appointmentId = params.id;

    // Single Atomic Transaction with Double-Refund Protection
    const result = await db.$transaction(async (tx: any) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          staff: true,
          customer: true,
        },
      });

      if (!appointment) {
        return { notFound: true };
      }

      // 1. Double-Refund Guard
      if (appointment.paymentStatus === "REFUNDED") {
        return {
          alreadyRefunded: true,
          message: "This appointment has already been refunded.",
        };
      }

      // 2. Paid Amount Check
      if (appointment.paidAmountCents <= 0 || !appointment.stripePaymentIntentId) {
        return {
          noPayment: true,
          message: "No captured payment or payment intent found to refund.",
        };
      }

      // 3. Execute Stripe Refund
      const refund = await createStripeRefund({
        paymentIntentId: appointment.stripePaymentIntentId,
        amountCents: appointment.paidAmountCents,
        reason: "Manual refund issued by business owner",
      });

      // 4. Update Appointment Payment Status
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          paymentStatus: "REFUNDED",
          stripeRefundId: refund.refundId,
        },
        include: {
          service: true,
          staff: true,
          customer: true,
        },
      });

      return { success: true, appointment: updated };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (result.alreadyRefunded) {
      return NextResponse.json({ error: result.message, alreadyRefunded: true }, { status: 400 });
    }

    if (result.noPayment) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Refund issued successfully.",
      appointment: result.appointment,
    });
  } catch (error: any) {
    console.error("Error processing manual refund:", error);
    return NextResponse.json({ error: error.message || "Failed to issue refund" }, { status: 500 });
  }
}
