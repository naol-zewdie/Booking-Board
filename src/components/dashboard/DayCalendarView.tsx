"use client";

import React from "react";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { Clock, User, Sparkles, CheckCircle2 } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DashboardAppointmentItem } from "./AppointmentDetailsModal";

interface StaffMember {
  id: string;
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
}

interface DayCalendarViewProps {
  dateStr: string; // "YYYY-MM-DD"
  timezone: string;
  currency: string;
  staffList: StaffMember[];
  appointments: DashboardAppointmentItem[];
  onSelectAppointment: (appointment: DashboardAppointmentItem) => void;
}

export function DayCalendarView({
  dateStr,
  timezone,
  currency,
  staffList,
  appointments,
  onSelectAppointment,
}: DayCalendarViewProps) {
  // Timeline hours from 8:00 AM (480 min) to 8:00 PM (1200 min)
  const startHour = 8;
  const endHour = 20;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const startDayMinutes = startHour * 60;
  const totalDayMinutes = (endHour - startHour) * 60;
  const hourHeightPx = 64; // Height in pixels for each 1 hour block

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
      {/* Specialists Column Header */}
      <div className="grid border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 sticky top-0 z-20"
        style={{
          gridTemplateColumns: `64px repeat(${staffList.length}, minmax(200px, 1fr))`,
        }}
      >
        <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200/80 dark:border-slate-800 flex items-center justify-center">
          <Clock className="h-3.5 w-3.5" />
        </div>

        {staffList.map((st) => (
          <div
            key={st.id}
            className="p-3.5 border-r border-slate-200/80 dark:border-slate-800 last:border-r-0 flex items-center gap-2.5"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {st.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-heading font-bold text-xs text-slate-900 dark:text-white truncate">
                {st.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">{st.role || "Specialist"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hourly Timeline Grid Container */}
      <div className="overflow-x-auto">
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `64px repeat(${staffList.length}, minmax(200px, 1fr))`,
            minHeight: `${(endHour - startHour) * hourHeightPx}px`,
          }}
        >
          {/* Time Labels Column */}
          <div className="border-r border-slate-200/80 dark:border-slate-800 select-none bg-slate-50/40 dark:bg-slate-950/20">
            {hours.slice(0, -1).map((h) => {
              const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
              const ampm = h >= 12 ? "PM" : "AM";

              return (
                <div
                  key={h}
                  className="border-b border-slate-100 dark:border-slate-800/60 text-right pr-2.5 pt-1 text-[10px] font-mono font-medium text-slate-400"
                  style={{ height: `${hourHeightPx}px` }}
                >
                  {displayHour}:00 {ampm}
                </div>
              );
            })}
          </div>

          {/* Specialist Columns with Positioned Appointment Blocks */}
          {staffList.map((st) => {
            const staffAppointments = appointments.filter((a) => a.staffId === st.id);

            return (
              <div
                key={st.id}
                className="border-r border-slate-200/80 dark:border-slate-800 last:border-r-0 relative"
              >
                {/* Background Hour Guidelines */}
                {hours.slice(0, -1).map((h) => (
                  <div
                    key={h}
                    className="border-b border-slate-100 dark:border-slate-800/60"
                    style={{ height: `${hourHeightPx}px` }}
                  />
                ))}

                {/* Render Appointments as Absolute Positioned Blocks */}
                {staffAppointments.map((apt) => {
                  const startsAt = new Date(apt.startsAt);
                  const endsAt = new Date(apt.endsAt);

                  // Calculate start minutes from midnight in local day
                  const startMins = startsAt.getHours() * 60 + startsAt.getMinutes();
                  const durationMins = differenceInMinutes(endsAt, startsAt);

                  // Top position relative to startHour
                  const topPx = Math.max(0, ((startMins - startDayMinutes) / 60) * hourHeightPx);
                  const heightPx = Math.max(36, (durationMins / 60) * hourHeightPx);

                  const statusColors: Record<string, string> = {
                    CONFIRMED: "border-primary-500 bg-primary-500/10 text-primary-900 dark:text-primary-100",
                    COMPLETED: "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
                    CANCELLED: "border-rose-400 bg-rose-400/10 text-rose-800 dark:text-rose-200 opacity-60",
                    NO_SHOW: "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-100",
                  };

                  return (
                    <div
                      key={apt.id}
                      onClick={() => onSelectAppointment(apt)}
                      className={`absolute left-1.5 right-1.5 p-2 rounded-2xl border cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all z-10 overflow-hidden flex flex-col justify-between ${
                        statusColors[apt.status] || "border-slate-400 bg-slate-100"
                      }`}
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: apt.service?.color || "#6366f1" }}
                          />
                          <p className="font-heading font-bold text-xs truncate">
                            {apt.customer?.name}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-semibold shrink-0">
                          {startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 truncate">
                        <span className="truncate">{apt.service?.name}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {formatPrice(apt.service?.priceCents || 0, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
