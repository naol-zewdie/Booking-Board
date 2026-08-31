"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Users,
  Clock,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Layers,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DayCalendarView } from "./DayCalendarView";
import { WeekCalendarView } from "./WeekCalendarView";
import { AgendaCalendarView } from "./AgendaCalendarView";
import {
  AppointmentDetailsModal,
  DashboardAppointmentItem,
} from "./AppointmentDetailsModal";
import { NewAppointmentModal } from "./NewAppointmentModal";

export interface BookingBoardBusinessData {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  services: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
    bufferMin: number;
    color?: string | null;
  }[];
  staff: {
    id: string;
    name: string;
    role?: string | null;
    avatarUrl?: string | null;
    serviceIds?: string[];
  }[];
  initialAppointments: DashboardAppointmentItem[];
}

interface BookingBoardProps {
  business: BookingBoardBusinessData;
}

export function BookingBoard({ business }: BookingBoardProps) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "agenda">("day");
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    return format(new Date(), "yyyy-MM-dd");
  });
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [appointments, setAppointments] = useState<DashboardAppointmentItem[]>(
    business.initialAppointments || []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [activeAppointment, setActiveAppointment] = useState<DashboardAppointmentItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

  // Fetch appointments whenever date, range, or staff filter changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchAppointments() {
      setIsLoading(true);
      try {
        const range = viewMode === "week" ? "week" : "day";
        const staffParam = selectedStaffFilter !== "all" ? `&staffId=${selectedStaffFilter}` : "";
        const url = `/api/appointments?businessId=${business.id}&date=${currentDateStr}&range=${range}${staffParam}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!isCancelled && res.ok) {
          setAppointments(data.appointments || []);
        }
      } catch (err) {
        console.error("Error fetching board appointments:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    fetchAppointments();

    return () => {
      isCancelled = true;
    };
  }, [business.id, currentDateStr, viewMode, selectedStaffFilter]);

  // Date Navigation handlers
  function handlePrev() {
    const [y, m, d] = currentDateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const newDate = viewMode === "week" ? subWeeks(date, 1) : subDays(date, 1);
    setCurrentDateStr(format(newDate, "yyyy-MM-dd"));
  }

  function handleNext() {
    const [y, m, d] = currentDateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const newDate = viewMode === "week" ? addWeeks(date, 1) : addDays(date, 1);
    setCurrentDateStr(format(newDate, "yyyy-MM-dd"));
  }

  function handleToday() {
    setCurrentDateStr(format(new Date(), "yyyy-MM-dd"));
  }

  function handleSelectAppointment(apt: DashboardAppointmentItem) {
    setActiveAppointment(apt);
    setIsDetailsOpen(true);
  }

  function handleAppointmentUpdated(updated: DashboardAppointmentItem) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }

  function handleAppointmentCreated(newApt: DashboardAppointmentItem) {
    setAppointments((prev) => [...prev, newApt]);
  }

  // Filter staff list for day column view if filtered
  const displayedStaff = selectedStaffFilter === "all"
    ? business.staff
    : business.staff.filter((s) => s.id === selectedStaffFilter);

  // Metrics summary
  const totalBookings = appointments.length;
  const confirmedCount = appointments.filter((a) => a.status === "CONFIRMED").length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const totalRevenueCents = appointments
    .filter((a) => a.status !== "CANCELLED")
    .reduce((sum, a) => sum + (a.service?.priceCents || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Bookings
            </span>
            <p className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
              {totalBookings}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Confirmed
            </span>
            <p className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
              {confirmedCount}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Completed
            </span>
            <p className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
              {completedCount}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Expected Revenue
            </span>
            <p className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
              {formatPrice(totalRevenueCents, business.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Board Control Bar */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrev}
              className="h-8 w-8 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 h-8 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="h-8 w-8 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Date Picker */}
          <Input
            type="date"
            value={currentDateStr}
            onChange={(e) => setCurrentDateStr(e.target.value)}
            className="h-9 w-40 text-xs rounded-2xl"
          />

          <Badge variant="default" className="text-[10px] font-mono hidden sm:inline">
            {business.timezone}
          </Badge>
        </div>

        {/* Right: View Mode Toggle, Staff Filter, Add Appointment */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Specialist Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Specialists ({business.staff.length})</option>
              {business.staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === "day"
                  ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === "week"
                  ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === "agenda"
                  ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Agenda
            </button>
          </div>

          {/* New Appointment / Walk-in Button */}
          <Button
            type="button"
            onClick={() => setIsNewAppointmentOpen(true)}
            className="h-9 text-xs rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold gap-1.5 shadow-glow"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Appointment</span>
          </Button>
        </div>
      </div>

      {/* Render Dynamic Calendar View */}
      {viewMode === "day" && (
        <DayCalendarView
          dateStr={currentDateStr}
          timezone={business.timezone}
          currency={business.currency}
          staffList={displayedStaff}
          appointments={appointments}
          onSelectAppointment={handleSelectAppointment}
        />
      )}

      {viewMode === "week" && (
        <WeekCalendarView
          currentDateStr={currentDateStr}
          currency={business.currency}
          timezone={business.timezone}
          appointments={appointments}
          onSelectAppointment={handleSelectAppointment}
          onSelectDate={(date) => {
            setCurrentDateStr(date);
            setViewMode("day");
          }}
        />
      )}

      {viewMode === "agenda" && (
        <AgendaCalendarView
          appointments={appointments}
          currency={business.currency}
          onSelectAppointment={handleSelectAppointment}
        />
      )}

      {/* Appointment Details Slide-over / Modal */}
      <AppointmentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        appointment={activeAppointment}
        currency={business.currency}
        timezone={business.timezone}
        onAppointmentUpdated={handleAppointmentUpdated}
      />

      {/* New Walk-in Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentOpen}
        onClose={() => setIsNewAppointmentOpen(false)}
        businessSlug={business.slug}
        businessTimezone={business.timezone}
        currency={business.currency}
        services={business.services}
        staffList={business.staff}
        defaultDate={currentDateStr}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  );
}
