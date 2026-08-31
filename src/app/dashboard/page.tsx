import React from "react";
import Link from "next/link";
import { Sparkles, Layers, Plus, ExternalLink, Building } from "lucide-react";
import db from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BookingBoard, BookingBoardBusinessData } from "@/components/dashboard/BookingBoard";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams?: { b?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const selectedSlug = searchParams?.b;

  // 1. Fetch the business with full relations
  const business: any = selectedSlug
    ? await (db as any).business.findUnique({
        where: { slug: selectedSlug },
        include: {
          services: { where: { active: true }, orderBy: { createdAt: "asc" } },
          staff: {
            where: { active: true },
            orderBy: { createdAt: "asc" },
            include: {
              workingHours: true,
              staffServices: true,
            },
          },
          appointments: {
            include: {
              customer: true,
              service: true,
              staff: true,
            },
            orderBy: { startsAt: "asc" },
          },
        },
      })
    : await (db as any).business.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          services: { where: { active: true }, orderBy: { createdAt: "asc" } },
          staff: {
            where: { active: true },
            orderBy: { createdAt: "asc" },
            include: {
              workingHours: true,
              staffServices: true,
            },
          },
          appointments: {
            include: {
              customer: true,
              service: true,
              staff: true,
            },
            orderBy: { startsAt: "asc" },
          },
        },
      });

  // Empty state if no business exists
  if (!business) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="h-16 w-16 rounded-3xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center mx-auto mb-4">
          <Layers className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold font-heading">No Business Created Yet</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Get started by setting up your services, working hours, and customized booking link.
        </p>
        <Link href="/onboarding">
          <Button variant="glow" size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Launch Onboarding Wizard</span>
          </Button>
        </Link>
      </div>
    );
  }

  const formattedBoardData: BookingBoardBusinessData = {
    id: business.id,
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    currency: business.currency,
    services: business.services.map((s: any) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      bufferMin: s.bufferMin,
      color: s.color,
    })),
    staff: business.staff.map((st: any) => ({
      id: st.id,
      name: st.name,
      role: st.role,
      avatarUrl: st.avatarUrl,
      serviceIds: st.staffServices ? st.staffServices.map((ss: any) => ss.serviceId) : [],
    })),
    initialAppointments: business.appointments.map((apt: any) => ({
      id: apt.id,
      businessId: apt.businessId,
      staffId: apt.staffId,
      serviceId: apt.serviceId,
      customerId: apt.customerId,
      startsAt: apt.startsAt.toISOString(),
      endsAt: apt.endsAt.toISOString(),
      status: apt.status,
      paymentStatus: apt.paymentStatus,
      notes: apt.notes,
      service: apt.service
        ? {
            id: apt.service.id,
            name: apt.service.name,
            durationMin: apt.service.durationMin,
            priceCents: apt.service.priceCents,
            bufferMin: apt.service.bufferMin,
            color: apt.service.color,
          }
        : undefined,
      staff: apt.staff
        ? {
            id: apt.staff.id,
            name: apt.staff.name,
            role: apt.staff.role,
            avatarUrl: apt.staff.avatarUrl,
          }
        : undefined,
      customer: apt.customer
        ? {
            id: apt.customer.id,
            name: apt.customer.name,
            email: apt.customer.email,
            phone: apt.customer.phone,
          }
        : undefined,
    })),
  };

  return <BookingBoard business={formattedBoardData} />;
}
