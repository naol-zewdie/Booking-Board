"use client";

import React from "react";
import { UserCheck, Sparkles, Check, Users } from "lucide-react";

export interface BookingStaffItem {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  serviceIds?: string[];
}

interface StaffSelectorProps {
  staffList: BookingStaffItem[];
  selectedStaff: BookingStaffItem | null; // null represents "Any Available"
  selectedServiceId?: string;
  onSelectStaff: (staff: BookingStaffItem | null) => void;
}

export function StaffSelector({
  staffList,
  selectedStaff,
  selectedServiceId,
  onSelectStaff,
}: StaffSelectorProps) {
  const isAnySelected = selectedStaff === null;

  // Filter staff by service eligibility
  const eligibleStaff = staffList.filter((st) => {
    if (!st.active) return false;
    if (!selectedServiceId || !st.serviceIds || st.serviceIds.length === 0) return true;
    return st.serviceIds.includes(selectedServiceId);
  });

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
          2. Select a Specialist
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pick a preferred team member, or select &quot;Any Specialist&quot; for maximum time availability.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Featured Option: Any Available Specialist */}
        <div
          onClick={() => onSelectStaff(null)}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 sm:col-span-2 group ${
            isAnySelected
              ? "bg-primary-50/70 dark:bg-primary-950/40 border-primary-500 shadow-md ring-2 ring-primary-500/20"
              : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Any Available Specialist
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically matches you with whoever is free first for your selected time.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={`h-8 px-3 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              isAnySelected
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary-50 group-hover:text-primary-700 dark:group-hover:bg-primary-950 dark:group-hover:text-primary-300"
            }`}
          >
            {isAnySelected ? "Selected" : "Select"}
          </button>
        </div>

        {/* Individual Staff Cards */}
        {eligibleStaff.map((st) => {
          const isSelected = selectedStaff?.id === st.id;

            return (
              <div
                key={st.id}
                onClick={() => onSelectStaff(st)}
                className={`p-4 rounded-3xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 group ${
                  isSelected
                    ? "bg-primary-50/70 dark:bg-primary-950/40 border-primary-500 shadow-md ring-2 ring-primary-500/20"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                    {st.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {st.role || "Specialist"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`h-7 px-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary-50 group-hover:text-primary-700 dark:group-hover:bg-primary-950 dark:group-hover:text-primary-300"
                  }`}
                >
                  {isSelected ? "Selected" : "Select"}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
