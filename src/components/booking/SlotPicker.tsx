"use client";

import React, { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Sun,
  Sunset,
  Moon,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Globe,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingServiceItem } from "./ServiceSelector";
import { BookingStaffItem } from "./StaffSelector";

export interface ResolvedSlot {
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  formattedTime: string; // "09:00 AM"
  formattedDate: string; // "2026-09-01"
  staffId?: string;
  staffName?: string;
}

interface SlotPickerProps {
  businessSlug: string;
  businessTimezone: string;
  service: BookingServiceItem;
  staff: BookingStaffItem | null; // null represents "Any Available"
  selectedSlot: ResolvedSlot | null;
  onSelectSlot: (slot: ResolvedSlot) => void;
  collisionAlert?: string | null;
}

export function SlotPicker({
  businessSlug,
  businessTimezone,
  service,
  staff,
  selectedSlot,
  onSelectSlot,
  collisionAlert,
}: SlotPickerProps) {
  // Generate next 14 selectable calendar dates starting from today
  const [dateList] = useState<Date[]>(() => {
    const list: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      list.push(addDays(today, i));
    }
    return list;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return format(dateList[0] || new Date(), "yyyy-MM-dd");
  });

  const [slots, setSlots] = useState<ResolvedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Fetch slots whenever selectedDate, service, or staff changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchAvailability() {
      setIsLoading(true);
      setFetchError("");

      try {
        const staffParam = staff ? `&staffId=${staff.id}` : "";
        const url = `/api/businesses/${businessSlug}/availability?serviceId=${service.id}&date=${selectedDate}${staffParam}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load available times");
        }

        if (!isCancelled) {
          setSlots(data.slots || []);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setFetchError(err.message || "Failed to load slots.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchAvailability();

    return () => {
      isCancelled = true;
    };
  }, [businessSlug, service.id, staff, selectedDate]);

  // Group slots by Morning / Afternoon / Evening
  const morningSlots = slots.filter((s) => {
    const d = new Date(s.startsAt);
    return s.formattedTime.includes("AM") || s.formattedTime.startsWith("12:") === false;
  }).filter((s) => s.formattedTime.includes("AM"));

  const afternoonSlots = slots.filter((s) => {
    if (!s.formattedTime.includes("PM")) return false;
    const hour = parseInt(s.formattedTime.split(":")[0] || "0", 10);
    return hour === 12 || (hour >= 1 && hour < 5);
  });

  const eveningSlots = slots.filter((s) => {
    if (!s.formattedTime.includes("PM")) return false;
    const hour = parseInt(s.formattedTime.split(":")[0] || "0", 10);
    return hour >= 5 && hour < 12;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
          3. Select Date & Time
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pick a date and choose an available start time for your appointment.
        </p>
      </div>

      {/* 409 Conflict Collision Auto-Recovery Alert */}
      {collisionAlert && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-xs shadow-sm animate-in zoom-in-95">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Slot Just Booked</p>
            <p className="mt-0.5">{collisionAlert}</p>
          </div>
        </div>
      )}

      {/* Date Selector Strip */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Select Day
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {dateList.map((d) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const isSelected = selectedDate === dateStr;
            const dayOfWeek = format(d, "EEE");
            const dayNum = format(d, "d");
            const monthName = format(d, "MMM");

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[70px] py-3 px-2 rounded-2xl border transition-all duration-200 shrink-0 ${
                  isSelected
                    ? "bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-primary-500/20 scale-105"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-primary-100" : "text-slate-400"}`}>
                  {dayOfWeek}
                </span>
                <span className="text-base font-heading font-extrabold my-0.5">
                  {dayNum}
                </span>
                <span className={`text-[10px] font-medium ${isSelected ? "text-primary-200" : "text-slate-400"}`}>
                  {monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prominent Business Timezone Banner */}
      <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary-500 shrink-0" />
          <span>
            All times displayed in <strong>{businessTimezone}</strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
          {service.durationMin}m duration + {service.bufferMin}m cleanup
        </span>
      </div>

      {/* Available Slots Section */}
      <div className="space-y-5">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 py-8">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="h-11 rounded-2xl bg-slate-200 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-8 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
            {fetchError}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-white/40 dark:bg-slate-900/40">
            <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No available times on this date
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Please select another day from the calendar strip above.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Morning Group */}
            {morningSlots.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span>Morning</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;

                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`h-11 px-2 rounded-2xl text-xs font-bold font-mono transition-all duration-200 border flex flex-col items-center justify-center shadow-sm ${
                          isSelected
                            ? "bg-primary-600 text-white border-primary-600 ring-2 ring-primary-500/20 scale-105"
                            : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                        }`}
                      >
                        <span>{slot.formattedTime}</span>
                        {slot.staffName && !staff && (
                          <span className={`text-[9px] font-sans truncate max-w-[80px] font-normal ${isSelected ? "text-primary-100" : "text-slate-400"}`}>
                            {slot.staffName.split(" ")[0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Afternoon Group */}
            {afternoonSlots.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <Sunset className="h-4 w-4 text-orange-500" />
                  <span>Afternoon</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;

                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`h-11 px-2 rounded-2xl text-xs font-bold font-mono transition-all duration-200 border flex flex-col items-center justify-center shadow-sm ${
                          isSelected
                            ? "bg-primary-600 text-white border-primary-600 ring-2 ring-primary-500/20 scale-105"
                            : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                        }`}
                      >
                        <span>{slot.formattedTime}</span>
                        {slot.staffName && !staff && (
                          <span className={`text-[9px] font-sans truncate max-w-[80px] font-normal ${isSelected ? "text-primary-100" : "text-slate-400"}`}>
                            {slot.staffName.split(" ")[0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evening Group */}
            {eveningSlots.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>Evening</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {eveningSlots.map((slot) => {
                    const isSelected = selectedSlot?.startsAt === slot.startsAt;

                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => onSelectSlot(slot)}
                        className={`h-11 px-2 rounded-2xl text-xs font-bold font-mono transition-all duration-200 border flex flex-col items-center justify-center shadow-sm ${
                          isSelected
                            ? "bg-primary-600 text-white border-primary-600 ring-2 ring-primary-500/20 scale-105"
                            : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                        }`}
                      >
                        <span>{slot.formattedTime}</span>
                        {slot.staffName && !staff && (
                          <span className={`text-[9px] font-sans truncate max-w-[80px] font-normal ${isSelected ? "text-primary-100" : "text-slate-400"}`}>
                            {slot.staffName.split(" ")[0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
