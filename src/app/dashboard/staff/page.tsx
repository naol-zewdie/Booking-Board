import React from "react";
import db from "@/lib/db";
import { StaffManager, StaffItem } from "@/components/staff/StaffManager";

export const dynamic = "force-dynamic";

interface StaffPageProps {
  searchParams?: { b?: string };
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const selectedSlug = searchParams?.b;

  const business = selectedSlug
    ? await db.business.findUnique({
        where: { slug: selectedSlug },
        include: {
          staff: {
            orderBy: { createdAt: "asc" },
            include: {
              workingHours: { orderBy: { weekday: "asc" } },
              _count: { select: { appointments: true } },
            },
          },
        },
      })
    : await db.business.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          staff: {
            orderBy: { createdAt: "asc" },
            include: {
              workingHours: { orderBy: { weekday: "asc" } },
              _count: { select: { appointments: true } },
            },
          },
        },
      });

  if (!business) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-500">No active business found.</p>
      </div>
    );
  }

  const formattedStaff: StaffItem[] = business.staff.map((st: any) => ({
    id: st.id,
    name: st.name,
    email: st.email,
    phone: st.phone,
    role: st.role,
    avatarUrl: st.avatarUrl,
    active: st.active,
    createdAt: st.createdAt.toISOString(),
    workingHours: st.workingHours.map((wh: any) => ({
      id: wh.id,
      weekday: wh.weekday,
      startMin: wh.startMin,
      endMin: wh.endMin,
    })),
    _count: {
      appointments: st._count.appointments,
    },
  }));

  return <StaffManager initialStaff={formattedStaff} businessId={business.id} />;
}
