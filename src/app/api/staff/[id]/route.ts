import { NextResponse } from "next/server";
import db from "@/lib/db";
import { updateStaffSchema } from "@/lib/validations/staff";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const staff = await db.staff.findUnique({
      where: { id: params.id },
      include: {
        workingHours: { orderBy: { weekday: "asc" } },
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ staff });
  } catch (error: any) {
    console.error("Error fetching staff member:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch staff" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const validatedData = updateStaffSchema.parse(body);

    const existing = await db.staff.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const updated = await db.staff.update({
      where: { id: params.id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.email !== undefined && { email: validatedData.email || null }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone || null }),
        ...(validatedData.role !== undefined && { role: validatedData.role || null }),
        ...(validatedData.avatarUrl !== undefined && { avatarUrl: validatedData.avatarUrl || null }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
      include: {
        workingHours: { orderBy: { weekday: "asc" } },
        _count: { select: { appointments: true } },
      },
    });

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: any) {
    console.error("Error updating staff:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const staff = await db.staff.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Protection rule: Check appointment history
    if (staff._count.appointments > 0) {
      return NextResponse.json(
        {
          error: `This staff member has ${staff._count.appointments} associated appointment${
            staff._count.appointments > 1 ? "s" : ""
          } in history and cannot be permanently deleted. You can deactivate them instead to remove them from future booking availability without corrupting past records.`,
          appointmentCount: staff._count.appointments,
          canDeactivate: true,
          staffId: staff.id,
        },
        { status: 409 }
      );
    }

    // Safe delete
    await db.staff.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Staff member deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting staff:", error);
    return NextResponse.json({ error: error.message || "Failed to delete staff" }, { status: 500 });
  }
}
