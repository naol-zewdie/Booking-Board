"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  User,
  Download,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Building,
  ShieldCheck,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  generateIcsFileContent,
  generateGoogleCalendarUrl,
  downloadIcsFile,
} from "@/lib/calendar/ics";

interface BookingConfirmationProps {
  businessSlug: string;
  businessName: string;
  businessTimezone: string;
  currency: string;
  appointment: any;
  onBookAnother: () => void;
}

export function BookingConfirmation({
  businessSlug,
  businessName,
  businessTimezone,
  currency,
  appointment,
  onBookAnother,
}: BookingConfirmationProps) {
  const service = appointment?.service;
  const staff = appointment?.staff;
  const customer = appointment?.customer;

  const startsAt = new Date(appointment.startsAt);
  const endsAt = new Date(appointment.endsAt);

  const eventDetails = {
    title: `${service?.name || "Appointment"} with ${staff?.name || "Specialist"}`,
    description: `Booking confirmed with ${businessName}.\nService: ${service?.name}\nSpecialist: ${staff?.name}\nCustomer: ${customer?.name}`,
    location: businessName,
    startsAt,
    endsAt,
    businessName,
  };

  function handleDownloadIcs() {
    const icsContent = generateIcsFileContent(eventDetails);
    downloadIcsFile(
      `appointment-${service?.name?.toLowerCase().replace(/\s+/g, "-") || "booking"}`,
      icsContent
    );
  }

  const googleCalendarUrl = generateGoogleCalendarUrl(eventDetails);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 animate-in zoom-in-95 duration-300">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="h-16 w-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-3 w-3" />
          <span>Appointment Confirmed</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 dark:text-white">
          You&apos;re All Booked!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          A confirmation has been scheduled for <strong>{customer?.name}</strong> at{" "}
          <strong>{businessName}</strong>.
        </p>
      </div>

      {/* Appointment Ticket Card */}
      <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Confirmation ID
            </span>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              #{appointment.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            {appointment.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Treatment */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400 text-[11px] block">Service</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {service?.name}
            </p>
            <p className="text-slate-500">
              {formatDuration(service?.durationMin || 0)} duration
            </p>
          </div>

          {/* Specialist */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400 text-[11px] block">Specialist</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {staff?.name}
            </p>
            <p className="text-slate-500">{staff?.role || "Specialist"}</p>
          </div>

          {/* Date & Time */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400 text-[11px] block">Scheduled Time</span>
            <p className="font-bold text-primary-600 dark:text-primary-400 font-mono text-sm">
              {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-slate-500 font-medium">
              {startsAt.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Location & Timezone */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400 text-[11px] block">Location & Zone</span>
            <p className="font-bold text-slate-900 dark:text-white truncate">
              {businessName}
            </p>
            <p className="text-slate-400 font-mono text-[11px]">{businessTimezone}</p>
          </div>
        </div>

        {/* Customer Breakdown */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Booked for: <strong className="text-slate-800 dark:text-slate-200">{customer?.name}</strong>{" "}
            {customer?.email && `(${customer.email})`}
          </span>
          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {formatPrice(service?.priceCents || 0, currency)}
          </span>
        </div>
      </div>

      {/* Calendar Export Buttons */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-center text-slate-500">
          Add this appointment to your calendar:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow"
          >
            <CalendarIcon className="h-4 w-4 text-primary-500" />
            <span>Add to Google Calendar</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="h-11 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-500 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow"
          >
            <Download className="h-4 w-4 text-primary-500" />
            <span>Download .ICS Invite (Apple / Outlook)</span>
          </button>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBookAnother}
          className="w-full sm:w-auto text-xs gap-2 rounded-xl"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Book Another Service</span>
        </Button>

        <Link
          href={`/dashboard?b=${businessSlug}`}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          <span>View on Business Dashboard Board →</span>
        </Link>
      </div>
    </div>
  );
}
