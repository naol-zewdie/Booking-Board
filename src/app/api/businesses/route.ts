import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import { onboardingSchema } from "@/lib/validations/onboarding";

export async function GET() {
  try {
    const businesses = await db.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        services: { where: { active: true } },
        staff: { where: { active: true } },
        _count: {
          select: {
            appointments: true,
            customers: true,
          },
        },
      },
    });
    return NextResponse.json(businesses);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = onboardingSchema.parse(body);

    // Check slug uniqueness
    const existing = await db.business.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This booking URL slug is already taken. Please choose another one." },
        { status: 400 }
      );
    }

    // Execute creation in a transaction
    const business = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create Business
      const createdBusiness = await tx.business.create({
        data: {
          name: validatedData.businessName,
          slug: validatedData.slug,
          timezone: validatedData.timezone,
          currency: validatedData.currency,
          ownerUserId: "owner-demo",
        },
      });

      // 2. Create Services
      for (const svc of validatedData.services) {
        await tx.service.create({
          data: {
            businessId: createdBusiness.id,
            name: svc.name,
            description: svc.description,
            durationMin: svc.durationMin,
            priceCents: svc.priceCents,
            bufferMin: svc.bufferMin,
            color: svc.color || "#6366f1",
          },
        });
      }

      // 3. Create Staff & Working Hours
      for (const st of validatedData.staff) {
        const createdStaff = await tx.staff.create({
          data: {
            businessId: createdBusiness.id,
            name: st.name,
            email: st.email || null,
            role: st.role || "Team Member",
          },
        });

        // Add working hours
        if (st.workingHours && st.workingHours.length > 0) {
          for (const wh of st.workingHours) {
            if (wh.enabled) {
              await tx.workingHours.create({
                data: {
                  staffId: createdStaff.id,
                  weekday: wh.weekday,
                  startMin: wh.startMin,
                  endMin: wh.endMin,
                },
              });
            }
          }
        } else {
          // Default Mon–Fri 9am–5pm (540 to 1020)
          for (let day = 1; day <= 5; day++) {
            await tx.workingHours.create({
              data: {
                staffId: createdStaff.id,
                weekday: day,
                startMin: 540,
                endMin: 1020,
              },
            });
          }
        }
      }

      return createdBusiness;
    });

    return NextResponse.json({ success: true, business }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating business:", error);
    if (error.errors) {
      return NextResponse.json({ error: error.errors[0]?.message || "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create business" }, { status: 500 });
  }
}
