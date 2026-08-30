import React from "react";
import db from "@/lib/db";
import { ServicesManager, ServiceItem } from "@/components/services/ServicesManager";

export const dynamic = "force-dynamic";

interface ServicesPageProps {
  searchParams?: { b?: string };
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const selectedSlug = searchParams?.b;

  const business = selectedSlug
    ? await db.business.findUnique({
        where: { slug: selectedSlug },
        include: {
          services: {
            orderBy: { createdAt: "asc" },
            include: {
              _count: { select: { appointments: true } },
            },
          },
        },
      })
    : await db.business.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          services: {
            orderBy: { createdAt: "asc" },
            include: {
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

  const formattedServices: ServiceItem[] = business.services.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    bufferMin: s.bufferMin,
    color: s.color || "#6366f1",
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    _count: {
      appointments: s._count.appointments,
    },
  }));

  return (
    <ServicesManager
      initialServices={formattedServices}
      currency={business.currency}
      businessId={business.id}
    />
  );
}
