"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Sparkles, Check, Copy } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  WEEKDAYS,
  minutesTo24hTime,
  timeStringToMinutes,
  minutesToTimeString,
} from "@/lib/timezones";

export interface WorkingHourItem {
  id?: string;
  weekday: number;
  startMin: number;
  endMin: number;
  enabled?: boolean;
}

interface WorkingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  initialHours: WorkingHourItem[];
  onSaved: (hours: WorkingHourItem[]) => void;
}

export function WorkingHoursModal({
  isOpen,
  onClose,
  staffId,
  staffName,
  initialHours,
  onSaved,
}: WorkingHoursModalProps) {
  const [schedule, setSchedule] = useState<{
    weekday: number;
    startMin: number;
    endMin: number;
    enabled: boolean;
  }[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize schedule from initialHours
  useEffect(() => {
    const defaultFullSchedule = WEEKDAYS.map((w) => {
      const match = initialHours.find((h) => h.weekday === w.dayIndex);
      return {
        weekday: w.dayIndex,
        startMin: match ? match.startMin : 540, // 9:00 AM
        endMin: match ? match.endMin : 1020, // 5:00 PM
        enabled: Boolean(match),
      };
    });
    setSchedule(defaultFullSchedule);
    setErrorMsg("");
  }, [initialHours, isOpen]);

  const handleToggleDay = (weekday: number) => {
    setSchedule((prev) =>
      prev.map((item) =>
        item.weekday === weekday ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleTimeChange = (
    weekday: number,
    type: "start" | "end",
    time24h: string
  ) => {
    const minutes = timeStringToMinutes(time24h);
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.weekday !== weekday) return item;
        return type === "start"
          ? { ...item, startMin: minutes }
          : { ...item, endMin: minutes };
      })
    );
  };

  // Quick Action: Set Standard Mon-Fri 9am-5pm
  const handleApplyMonFriTemplate = () => {
    setSchedule((prev) =>
      prev.map((item) => ({
        ...item,
        startMin: 540, // 9:00 AM
        endMin: 1020, // 5:00 PM
        enabled: item.weekday >= 1 && item.weekday <= 5, // Mon-Fri
      }))
    );
  };

  // Quick Action: Copy Monday hours to all active weekdays
  const handleCopyMondayHours = () => {
    const mon = schedule.find((s) => s.weekday === 1);
    if (!mon) return;

    setSchedule((prev) =>
      prev.map((item) => {
        if (item.weekday === 0 || item.weekday === 6) return item; // skip weekends
        return {
          ...item,
          startMin: mon.startMin,
          endMin: mon.endMin,
          enabled: true,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    // Validate that end time > start time for all enabled days
    for (const item of schedule) {
      if (item.enabled && item.endMin <= item.startMin) {
        const dayName = WEEKDAYS.find((w) => w.dayIndex === item.weekday)?.name;
        setErrorMsg(`On ${dayName}, end time must be later than start time.`);
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/staff/${staffId}/hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: schedule }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update working hours");
      }

      onSaved(data.workingHours);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Weekly Schedule: ${staffName}`}
      description="Define working days and hours for slot generation and availability."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Quick Templates */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-1">
            Quick Setup:
          </span>
          <button
            type="button"
            onClick={handleApplyMonFriTemplate}
            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium shadow-sm transition-colors"
          >
            Mon–Fri 9am–5pm
          </button>
          <button
            type="button"
            onClick={handleCopyMondayHours}
            className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium shadow-sm transition-colors flex items-center gap-1"
          >
            <Copy className="h-3 w-3" />
            <span>Copy Mon to Weekdays</span>
          </button>
        </div>

        {/* Weekday List */}
        <div className="space-y-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 bg-white/40 dark:bg-slate-900/40">
          {WEEKDAYS.map((w) => {
            const item = schedule.find((s) => s.weekday === w.dayIndex);
            const isEnabled = item?.enabled ?? false;

            return (
              <div
                key={w.dayIndex}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                  isEnabled
                    ? "bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/70 shadow-sm"
                    : "opacity-40 hover:opacity-75"
                }`}
              >
                {/* Checkbox & Day Name */}
                <div className="flex items-center gap-3 w-32">
                  <input
                    type="checkbox"
                    id={`hours-day-${w.dayIndex}`}
                    checked={isEnabled}
                    onChange={() => handleToggleDay(w.dayIndex)}
                    className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 cursor-pointer"
                  />
                  <label
                    htmlFor={`hours-day-${w.dayIndex}`}
                    className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer select-none"
                  >
                    {w.name}
                  </label>
                </div>

                {/* Time Pickers */}
                {isEnabled && item ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={minutesTo24hTime(item.startMin)}
                      onChange={(e) =>
                        handleTimeChange(w.dayIndex, "start", e.target.value)
                      }
                      className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/40 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-medium">to</span>
                    <input
                      type="time"
                      value={minutesTo24hTime(item.endMin)}
                      onChange={(e) =>
                        handleTimeChange(w.dayIndex, "end", e.target.value)
                      }
                      className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500/40 focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Day Off / Unavailable</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Form Actions */}
        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="glow" isLoading={isLoading} className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>Save Working Hours</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
