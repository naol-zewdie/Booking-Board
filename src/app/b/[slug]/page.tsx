import React from "react";
import { notFound } from "next/navigation";
import db from "@/lib/db";
import { BookingFlow, BookingBusinessData } from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

interface PublicBookingPageProps {
  params: { slug: string };
}

export default async function PublicBookingPage({ params }: PublicBookingPageProps) {
  const business: any = await db.business.findUnique({
    where: { slug: params.slug },
    include: {
      services: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
      },
      staff: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        include: {
          staffServices: true,
        },
      },
    },
  });

  if (!business) {
    notFound();
  }

  const formattedBusinessData: BookingBusinessData = {
    id: business.id,
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    currency: business.currency,
    description: business.description,
    services: business.services.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      bufferMin: s.bufferMin,
      color: s.color,
      active: s.active,
    })),
    staff: business.staff.map((st: any) => ({
      id: st.id,
      name: st.name,
      role: st.role,
      email: st.email,
      avatarUrl: st.avatarUrl,
      active: st.active,
      serviceIds: st.staffServices ? st.staffServices.map((ss: any) => ss.serviceId) : [],
    })),
  };

  return <BookingFlow business={formattedBusinessData} />;
}
