"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CancelBookingViewProps {
  business: {
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    phone?: string | null;
  };
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  service: {
    name: string;
    durationMin: number;
    priceCents: number;
    color?: string | null;
  };
  staff: {
    name: string;
    role?: string | null;
  };
  customer: {
    name: string;
    email?: string | null;
  };
  token: string;
  isPastNoticeCutoff: boolean;
}

export function CancelBookingView({
  business,
  appointment,
  service,
  staff,
  customer,
  token,
  isPastNoticeCutoff,
}: CancelBookingViewProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelledSuccess, setIsCancelledSuccess] = useState(
    appointment.status === "CANCELLED"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const startsAt = new Date(appointment.startsAt);
  const endsAt = new Date(appointment.endsAt);

  const formattedDate = startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = `${startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })} - ${endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  async function handleConfirmCancel() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/businesses/${business.slug}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason: reason.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel appointment.");
      }

      setIsCancelledSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel appointment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <Link
            href={`/b/${business.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {business.name}</span>
          </Link>
          <h1 className="text-2xl font-heading font-extrabold text-white">
            Manage Appointment
          </h1>
          <p className="text-xs text-slate-400">
            {business.name} • Timezone: {business.timezone}
          </p>
        </div>

        {/* Success Screen */}
        {isCancelledSuccess ? (
          <Card className="glass-card border-emerald-500/40 bg-slate-900/90 text-center p-6 space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-white">
                Appointment Cancelled
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Your appointment for <strong>{service.name}</strong> with <strong>{staff.name}</strong> on {formattedDate} has been cancelled and removed from our schedule.
              </p>
            </div>

            <div className="pt-2">
              <Link href={`/b/${business.slug}`}>
                <Button className="w-full rounded-2xl text-xs h-10 bg-primary-600 hover:bg-primary-500 text-white font-bold shadow-glow">
                  Book a New Appointment
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Appointment Details Card */}
            <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                  style={{ backgroundColor: service.color || "#6366f1" }}
                >
                  {service.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-white">
                    {service.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    with {staff.name} ({formatDuration(service.durationMin)})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> Date
                  </span>
                  <p className="font-semibold text-slate-200">{formattedDate}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time
                  </span>
                  <p className="font-bold text-primary-400 font-mono">{formattedTime}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Client: {customer.name}</span>
                <span className="font-extrabold text-emerald-400">
                  {formatPrice(service.priceCents, business.currency)}
                </span>
              </div>
            </div>

            {/* Notice Window Guard */}
            {isPastNoticeCutoff ? (
              <div className="p-4 rounded-3xl border border-amber-900/60 bg-amber-950/30 space-y-2 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Online Cancellation Window Passed</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Appointments cannot be cancelled online within 2 hours of start time. Please call <strong>{business.name}</strong> directly{business.phone ? ` at ${business.phone}` : ""} to make adjustments.
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Reason for Cancellation (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Let us know why you need to cancel..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
                  <Link href={`/b/${business.slug}`} className="w-full sm:w-auto flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-2xl text-xs h-10 border-slate-700 text-slate-300"
                    >
                      Keep Appointment
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmCancel}
                    className="w-full sm:w-auto flex-1 rounded-2xl text-xs h-10 bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5 shadow-glow"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Cancelling...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Confirm Cancellation</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
