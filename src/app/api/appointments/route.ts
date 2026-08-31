import { NextResponse } from "next/server";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import db from "@/lib/db";
import { getActiveBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessIdParam = searchParams.get("businessId");
    const dateParam = searchParams.get("date"); // e.g. "2026-09-01"
    const rangeParam = searchParams.get("range") || "day"; // "day" | "week"
    const staffIdParam = searchParams.get("staffId");
    const statusParam = searchParams.get("status");

    const business = await getActiveBusiness(businessIdParam || undefined);
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const businessTz = business.timezone || "UTC";

    // Target date in business timezone
    const baseDateStr = dateParam || new Date().toISOString().split("T")[0];
    const [year, month, day] = baseDateStr.split("-").map(Number);
    const localTargetDate = new Date(year, month - 1, day, 12, 0, 0);

    let startUtc: Date;
    let endUtc: Date;

    if (rangeParam === "week") {
      const weekStartLocal = startOfWeek(localTargetDate, { weekStartsOn: 0 }); // Sunday
      const weekEndLocal = endOfWeek(localTargetDate, { weekStartsOn: 0 }); // Saturday

      const weekStartStr = `${weekStartLocal.getFullYear()}-${(weekStartLocal.getMonth() + 1).toString().padStart(2, "0")}-${weekStartLocal.getDate().toString().padStart(2, "0")} 00:00:00`;
      const weekEndStr = `${weekEndLocal.getFullYear()}-${(weekEndLocal.getMonth() + 1).toString().padStart(2, "0")}-${weekEndLocal.getDate().toString().padStart(2, "0")} 23:59:59`;

      startUtc = fromZonedTime(weekStartStr, businessTz);
      endUtc = fromZonedTime(weekEndStr, businessTz);
    } else {
      const dayStartStr = `${baseDateStr} 00:00:00`;
      const dayEndStr = `${baseDateStr} 23:59:59`;

      startUtc = fromZonedTime(dayStartStr, businessTz);
      endUtc = fromZonedTime(dayEndStr, businessTz);
    }

    const whereClause: any = {
      businessId: business.id,
      startsAt: {
        gte: startUtc,
        lte: endUtc,
      },
    };

    if (staffIdParam && staffIdParam !== "all") {
      whereClause.staffId = staffIdParam;
    }

    if (statusParam && statusParam !== "all") {
      whereClause.status = statusParam;
    }

    const appointments = await db.appointment.findMany({
      where: whereClause,
      orderBy: { startsAt: "asc" },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });

    return NextResponse.json({
      businessId: business.id,
      timezone: businessTz,
      date: baseDateStr,
      range: rangeParam,
      appointments,
    });
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch appointments" }, { status: 500 });
  }
}
