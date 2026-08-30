import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";
import { createServiceSchema } from "@/lib/validations/service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const business = await getActiveBusiness(businessId || undefined);
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const services = await db.service.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    return NextResponse.json({ services, business });
  } catch (error: any) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch services" }, { status: 500 });
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
    const validatedData = createServiceSchema.parse(body);

    const service = await db.service.create({
      data: {
        businessId: business.id,
        name: validatedData.name,
        description: validatedData.description || null,
        durationMin: validatedData.durationMin,
        priceCents: validatedData.priceCents,
        bufferMin: validatedData.bufferMin,
        color: validatedData.color,
        active: validatedData.active,
      },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
    });

    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating service:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create service" }, { status: 500 });
  }
}
