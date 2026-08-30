import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";
import { createStaffSchema } from "@/lib/validations/staff";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const business = await getActiveBusiness(businessId || undefined);
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const staff = await db.staff.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      include: {
        workingHours: {
          orderBy: { weekday: "asc" },
        },
        _count: {
          select: { appointments: true },
        },
      },
    });

    return NextResponse.json({ staff, business });
  } catch (error: any) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessIdParam = searchParams.get("businessId");

    const business = await getActiveBusiness(businessIdParam || undefined);
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = createStaffSchema.parse(body);

    const createdStaff = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const staffMember = await tx.staff.create({
        data: {
          businessId: business.id,
          name: validatedData.name,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          role: validatedData.role || "Team Member",
          avatarUrl: validatedData.avatarUrl || null,
          active: validatedData.active,
        },
      });

      // Default Mon–Fri 9am–5pm (540 to 1020)
      for (let day = 1; day <= 5; day++) {
        await tx.workingHours.create({
          data: {
            staffId: staffMember.id,
            weekday: day,
            startMin: 540,
            endMin: 1020,
          },
        });
      }

      return await tx.staff.findUnique({
        where: { id: staffMember.id },
        include: {
          workingHours: { orderBy: { weekday: "asc" } },
          _count: { select: { appointments: true } },
        },
      });
    });

    return NextResponse.json({ success: true, staff: createdStaff }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating staff:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create staff" }, { status: 500 });
  }
}
