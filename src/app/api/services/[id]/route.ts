import { NextResponse } from "next/server";
import db from "@/lib/db";
import { updateServiceSchema } from "@/lib/validations/service";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const service = await db.service.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error: any) {
    console.error("Error fetching service:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch service" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const validatedData = updateServiceSchema.parse(body);

    const existing = await db.service.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updated = await db.service.update({
      where: { id: params.id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.durationMin !== undefined && { durationMin: validatedData.durationMin }),
        ...(validatedData.priceCents !== undefined && { priceCents: validatedData.priceCents }),
        ...(validatedData.bufferMin !== undefined && { bufferMin: validatedData.bufferMin }),
        ...(validatedData.color !== undefined && { color: validatedData.color }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error("Error updating service:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const service = await db.service.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Protection rule: If service has appointment history, block hard delete
    if (service._count.appointments > 0) {
      return NextResponse.json(
        {
          error: `This service has ${service._count.appointments} associated appointment${
            service._count.appointments > 1 ? "s" : ""
          } in history and cannot be deleted. You can deactivate it instead to hide it from new customer bookings.`,
          appointmentCount: service._count.appointments,
          canDeactivate: true,
          serviceId: service.id,
        },
        { status: 409 }
      );
    }

    // Otherwise safe to hard delete
    await db.service.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Service deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: error.message || "Failed to delete service" }, { status: 500 });
  }
}
