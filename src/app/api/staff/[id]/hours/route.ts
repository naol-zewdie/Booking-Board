import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { updateWorkingHoursSchema } from "@/lib/validations/staff";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const staff = await db.staff.findUnique({
      where: { id: params.id },
      include: {
        workingHours: { orderBy: { weekday: "asc" } },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ workingHours: staff.workingHours });
  } catch (error: any) {
    console.error("Error fetching working hours:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch hours" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const validatedData = updateWorkingHoursSchema.parse(body);

    const staff = await db.staff.findUnique({
      where: { id: params.id },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Atomic replacement of working hours
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Delete current hours
      await tx.workingHours.deleteMany({
        where: { staffId: params.id },
      });

      // 2. Insert enabled hours
      for (const h of validatedData.hours) {
        if (h.enabled) {
          await tx.workingHours.create({
            data: {
              staffId: params.id,
              weekday: h.weekday,
              startMin: h.startMin,
              endMin: h.endMin,
            },
          });
        }
      }
    });

    const updatedHours = await db.workingHours.findMany({
      where: { staffId: params.id },
      orderBy: { weekday: "asc" },
    });

    return NextResponse.json({ success: true, workingHours: updatedHours });
  } catch (error: any) {
    console.error("Error updating working hours:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update hours" }, { status: 500 });
  }
}
