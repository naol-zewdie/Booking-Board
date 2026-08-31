import { NextResponse } from "next/server";
import { startOfDay, endOfDay, parseISO, format } from "date-fns";
import db from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || searchParams.get("slug");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!businessId) {
      return NextResponse.json({ error: "businessId or slug is required" }, { status: 400 });
    }

    // 1. Fetch Business
    const business: any = await (db as any).business.findFirst({
      where: {
        OR: [{ id: businessId }, { slug: businessId }],
      },
      include: {
        staff: { where: { active: true } },
        services: { where: { active: true } },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Default to current 30-day window if not provided
    const now = new Date();
    const startDate = startDateParam ? parseISO(startDateParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateParam ? parseISO(endDateParam) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const rangeStart = startOfDay(startDate);
    const rangeEnd = endOfDay(endDate);

    // 2. Fetch Appointments within startsAt time window
    const appointments: any[] = await (db as any).appointment.findMany({
      where: {
        businessId: business.id,
        startsAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
      orderBy: { startsAt: "asc" },
    });

    // Exclude abandoned holds that never converted
    const validAppointments = appointments.filter(
      (a) => a.status !== "PENDING_PAYMENT" || a.paidAmountCents > 0
    );

    // 3. Status Distributions
    const completedCount = validAppointments.filter((a) => a.status === "COMPLETED").length;
    const confirmedCount = validAppointments.filter((a) => a.status === "CONFIRMED").length;
    const cancelledCount = validAppointments.filter((a) => a.status === "CANCELLED").length;
    const noShowCount = validAppointments.filter((a) => a.status === "NO_SHOW").length;
    const totalBookings = validAppointments.length;

    // Rates
    const finalizedCount = completedCount + noShowCount + cancelledCount;
    const completionRate = finalizedCount > 0 ? Math.round((completedCount / finalizedCount) * 100) : 0;

    const scheduledEvaluated = completedCount + noShowCount + confirmedCount;
    const noShowRate = scheduledEvaluated > 0 ? Math.round((noShowCount / scheduledEvaluated) * 100) : 0;

    const cancellationRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

    // Cancellation Breakdown
    const cancellationBreakdown = {
      customerRefunded: validAppointments.filter(
        (a) => a.status === "CANCELLED" && a.cancelledBy === "CUSTOMER" && a.paymentStatus === "REFUNDED"
      ).length,
      customerRetainedDeposit: validAppointments.filter(
        (a) => a.status === "CANCELLED" && a.cancelledBy === "CUSTOMER" && a.paymentStatus === "DEPOSIT_PAID"
      ).length,
      businessCancelled: validAppointments.filter(
        (a) => a.status === "CANCELLED" && a.cancelledBy === "BUSINESS"
      ).length,
      systemExpired: validAppointments.filter(
        (a) => a.status === "CANCELLED" && a.cancelledBy === "SYSTEM"
      ).length,
    };

    // 4. Revenue Metrics
    // Gross Revenue: Sum of paid amounts for all appointments in period (including rows later refunded)
    let grossRevenueCents = 0;
    // Refunds Issued: Sum of paid amounts on refunded appointments
    let refundsIssuedCents = 0;
    // Projected Revenue: Sum of catalog service price for active / completed appointments
    let projectedRevenueCents = 0;

    for (const a of validAppointments) {
      if (a.paidAmountCents > 0) {
        grossRevenueCents += a.paidAmountCents;
      }
      if (a.paymentStatus === "REFUNDED" && a.paidAmountCents > 0) {
        refundsIssuedCents += a.paidAmountCents;
      }
      if (a.status !== "CANCELLED") {
        projectedRevenueCents += a.service?.priceCents || 0;
      }
    }

    const netRevenueCents = grossRevenueCents - refundsIssuedCents;

    // 5. Daily Time-Series Data
    const dailyMap: Map<string, { date: string; grossCents: number; netCents: number; bookings: number; completed: number }> = new Map();

    for (const a of validAppointments) {
      const dayKey = format(a.startsAt, "yyyy-MM-dd");
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, { date: dayKey, grossCents: 0, netCents: 0, bookings: 0, completed: 0 });
      }
      const entry = dailyMap.get(dayKey)!;
      entry.bookings += 1;
      if (a.status === "COMPLETED") entry.completed += 1;
      if (a.paidAmountCents > 0) {
        entry.grossCents += a.paidAmountCents;
        entry.netCents += a.paymentStatus === "REFUNDED" ? 0 : a.paidAmountCents;
      }
    }

    const dailyMetrics = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Specialist Performance Matrix
    const staffMap: Map<string, { id: string; name: string; role: string | null; avatarUrl: string | null; total: number; completed: number; noShows: number; revenueCents: number }> = new Map();

    for (const st of business.staff) {
      staffMap.set(st.id, {
        id: st.id,
        name: st.name,
        role: st.role,
        avatarUrl: st.avatarUrl,
        total: 0,
        completed: 0,
        noShows: 0,
        revenueCents: 0,
      });
    }

    for (const a of validAppointments) {
      if (a.staffId && staffMap.has(a.staffId)) {
        const item = staffMap.get(a.staffId)!;
        item.total += 1;
        if (a.status === "COMPLETED") item.completed += 1;
        if (a.status === "NO_SHOW") item.noShows += 1;
        if (a.status !== "CANCELLED") {
          item.revenueCents += a.service?.priceCents || 0;
        }
      }
    }

    const staffMetrics = Array.from(staffMap.values());

    // 7. Service Popularity Matrix
    const serviceMap: Map<string, { id: string; name: string; color: string | null; priceCents: number; durationMin: number; bookingCount: number; revenueCents: number }> = new Map();

    for (const s of business.services) {
      serviceMap.set(s.id, {
        id: s.id,
        name: s.name,
        color: s.color,
        priceCents: s.priceCents,
        durationMin: s.durationMin,
        bookingCount: 0,
        revenueCents: 0,
      });
    }

    for (const a of validAppointments) {
      if (a.serviceId && serviceMap.has(a.serviceId)) {
        const item = serviceMap.get(a.serviceId)!;
        item.bookingCount += 1;
        if (a.status !== "CANCELLED") {
          item.revenueCents += a.service?.priceCents || 0;
        }
      }
    }

    const serviceMetrics = Array.from(serviceMap.values()).sort((a, b) => b.bookingCount - a.bookingCount);

    return NextResponse.json({
      success: true,
      timeframe: {
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      },
      summary: {
        totalBookings,
        completedCount,
        confirmedCount,
        cancelledCount,
        noShowCount,
        completionRate,
        noShowRate,
        cancellationRate,
        grossRevenueCents,
        refundsIssuedCents,
        netRevenueCents,
        projectedRevenueCents,
        currency: business.currency,
      },
      cancellationBreakdown,
      dailyMetrics,
      staffMetrics,
      serviceMetrics,
    });
  } catch (error: any) {
    console.error("Error computing business analytics:", error);
    return NextResponse.json({ error: error.message || "Failed to load analytics" }, { status: 500 });
  }
}
