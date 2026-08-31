import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Clock, ArrowLeft } from "lucide-react";
import db from "@/lib/db";
import { verifyAppointmentToken } from "@/lib/auth/tokens";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CancelBookingView } from "@/components/booking/CancelBookingView";

export const dynamic = "force-dynamic";

interface CancelPageProps {
  params: { slug: string };
  searchParams?: { token?: string };
}

export default async function CustomerCancelPage({
  params,
  searchParams,
}: CancelPageProps) {
  const token = searchParams?.token;

  // 1. Fetch Business
  const business: any = await db.business.findUnique({
    where: { slug: params.slug },
  });

  if (!business) {
    notFound();
  }

  // 2. Token Missing or Invalid Check
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass-card border-slate-800 bg-slate-900/90 text-center p-6 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-heading font-bold text-white">
            Missing Cancellation Link
          </h2>
          <p className="text-xs text-slate-400">
            Please use the cancellation link sent to your email confirmation to manage your booking.
          </p>
          <div className="pt-2">
            <Link href={`/b/${business.slug}`}>
              <Button className="w-full rounded-2xl text-xs bg-primary-600 hover:bg-primary-500 text-white font-bold">
                Go to {business.name} Booking Page
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const verification = verifyAppointmentToken(token, business.id);

  if (!verification.valid) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass-card border-rose-800/60 bg-slate-900/90 text-center p-6 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-heading font-bold text-white">
            {verification.reason === "EXPIRED"
              ? "Cancellation Link Expired"
              : "Invalid Cancellation Link"}
          </h2>
          <p className="text-xs text-slate-400">{verification.message}</p>
          <div className="pt-2">
            <Link href={`/b/${business.slug}`}>
              <Button className="w-full rounded-2xl text-xs bg-primary-600 hover:bg-primary-500 text-white font-bold">
                Return to {business.name}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 3. Fetch Appointment
  const appointment = await db.appointment.findUnique({
    where: { id: verification.payload.appointmentId },
    include: {
      service: true,
      staff: true,
      customer: true,
    },
  });

  if (!appointment) {
    notFound();
  }

  const minNoticeMs = 2 * 60 * 60 * 1000;
  const isPastNoticeCutoff =
    appointment.startsAt.getTime() - Date.now() < minNoticeMs;

  return (
    <CancelBookingView
      business={{
        name: business.name,
        slug: business.slug,
        timezone: business.timezone,
        currency: business.currency,
        phone: null,
      }}
      appointment={{
        id: appointment.id,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status,
      }}
      service={{
        name: appointment.service.name,
        durationMin: appointment.service.durationMin,
        priceCents: appointment.service.priceCents,
        color: appointment.service.color,
      }}
      staff={{
        name: appointment.staff.name,
        role: appointment.staff.role,
      }}
      customer={{
        name: appointment.customer.name,
        email: appointment.customer.email,
      }}
      token={token}
      isPastNoticeCutoff={isPastNoticeCutoff}
    />
  );
}
