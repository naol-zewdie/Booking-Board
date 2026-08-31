import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { canTransition } from "@/lib/appointments/stateMachine";

interface RouteParams {
  params: { id: string };
}

const updateAppointmentSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  paymentStatus: z.enum(["NONE", "DEPOSIT_PAID", "PAID", "REFUNDED"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const appointment = await db.appointment.findUnique({
      where: { id: params.id },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const validatedData = updateAppointmentSchema.parse(body);

    const existing = await db.appointment.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Enforce Appointment State Machine & Terminal State Rules
    if (validatedData.status && !canTransition(existing.status, validatedData.status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: Cannot change status from '${existing.status}' to '${validatedData.status}'. '${existing.status}' is a terminal state.`,
        },
        { status: 400 }
      );
    }

    const updated = await db.appointment.update({
      where: { id: params.id },
      data: {
        status: validatedData.status || existing.status,
        paymentStatus: validatedData.paymentStatus || existing.paymentStatus,
        notes: validatedData.notes !== undefined ? validatedData.notes : existing.notes,
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update appointment" }, { status: 500 });
  }
}
