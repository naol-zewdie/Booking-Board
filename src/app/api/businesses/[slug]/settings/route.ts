import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";

interface RouteParams {
  params: { slug: string };
}

const updateSettingsSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters").optional(),
  description: z.string().max(500).optional().nullable(),
  timezone: z.string().min(1, "Timezone is required").optional(),
  currency: z.string().length(3, "Currency must be 3-letter code").optional(),
  cancellationNoticeHours: z.coerce.number().int().min(0).max(168).optional(),
  refundNoticeHours: z.coerce.number().int().min(0).max(168).optional(),
});

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const business: any = await (db as any).business.findUnique({
      where: { slug: params.slug },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        timezone: business.timezone,
        currency: business.currency,
        cancellationNoticeHours: business.cancellationNoticeHours ?? 2,
        refundNoticeHours: business.refundNoticeHours ?? 24,
      },
    });
  } catch (error: any) {
    console.error("Error fetching business settings:", error);
    return NextResponse.json({ error: error.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const body = await req.json();
    const validatedData = updateSettingsSchema.parse(body);

    const business: any = await (db as any).business.findUnique({
      where: { slug: params.slug },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const updated: any = await (db as any).business.update({
      where: { slug: params.slug },
      data: {
        ...(validatedData.name ? { name: validatedData.name } : {}),
        ...(validatedData.description !== undefined ? { description: validatedData.description } : {}),
        ...(validatedData.timezone ? { timezone: validatedData.timezone } : {}),
        ...(validatedData.currency ? { currency: validatedData.currency.toUpperCase() } : {}),
        ...(validatedData.cancellationNoticeHours !== undefined
          ? { cancellationNoticeHours: validatedData.cancellationNoticeHours }
          : {}),
        ...(validatedData.refundNoticeHours !== undefined
          ? { refundNoticeHours: validatedData.refundNoticeHours }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      business: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        timezone: updated.timezone,
        currency: updated.currency,
        cancellationNoticeHours: updated.cancellationNoticeHours,
        refundNoticeHours: updated.refundNoticeHours,
      },
    });
  } catch (error: any) {
    console.error("Error updating business settings:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
