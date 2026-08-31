"use client";

import React from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Clock, Calendar as CalendarIcon, User } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DashboardAppointmentItem } from "./AppointmentDetailsModal";

interface WeekCalendarViewProps {
  currentDateStr: string; // "YYYY-MM-DD"
  currency: string;
  timezone: string;
  appointments: DashboardAppointmentItem[];
  onSelectAppointment: (appointment: DashboardAppointmentItem) => void;
  onSelectDate: (dateStr: string) => void;
}

export function WeekCalendarView({
  currentDateStr,
  currency,
  timezone,
  appointments,
  onSelectAppointment,
  onSelectDate,
}: WeekCalendarViewProps) {
  const [year, month, day] = currentDateStr.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day, 12, 0, 0);

  // Generate 7 days of the week starting from Sunday
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const today = new Date();

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
      {/* 7-Day Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-slate-800 min-h-[500px]">
        {weekDays.map((dayDate) => {
          const dayDateStr = format(dayDate, "yyyy-MM-dd");
          const isSelected = dayDateStr === currentDateStr;
          const isToday = isSameDay(dayDate, today);

          // Find appointments for this specific day
          const dayAppointments = appointments.filter((apt) => {
            const aptDateStr = format(new Date(apt.startsAt), "yyyy-MM-dd");
            return aptDateStr === dayDateStr;
          });

          return (
            <div
              key={dayDateStr}
              className={`p-3 space-y-3 flex flex-col justify-between ${
                isSelected
                  ? "bg-primary-50/40 dark:bg-primary-950/20"
                  : "bg-transparent"
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => onSelectDate(dayDateStr)}
                className="cursor-pointer group flex items-center justify-between md:flex-col md:items-start gap-1 pb-2.5 border-b border-slate-100 dark:border-slate-800/80"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {format(dayDate, "EEE")}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`h-7 w-7 rounded-xl flex items-center justify-center font-heading font-extrabold text-xs transition-colors ${
                        isToday
                          ? "bg-primary-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 group-hover:bg-primary-100 dark:group-hover:bg-primary-950"
                      }`}
                    >
                      {format(dayDate, "d")}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {format(dayDate, "MMM")}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {dayAppointments.length} Bookings
                </span>
              </div>

              {/* Day Appointment List */}
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] pr-0.5">
                {dayAppointments.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-slate-400 italic">
                    No bookings
                  </div>
                ) : (
                  dayAppointments.map((apt) => {
                    const startsAt = new Date(apt.startsAt);
                    const timeFormatted = startsAt.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={apt.id}
                        onClick={() => onSelectAppointment(apt)}
                        className="p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary-500 hover:shadow-sm cursor-pointer transition-all space-y-1 group"
                      >
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                            {timeFormatted}
                          </span>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: apt.service?.color || "#6366f1" }}
                          />
                        </div>

                        <p className="font-heading font-bold text-xs text-slate-900 dark:text-white truncate">
                          {apt.customer?.name}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 truncate">
                          <span className="truncate">{apt.service?.name}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {apt.staff?.name?.split(" ")[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
