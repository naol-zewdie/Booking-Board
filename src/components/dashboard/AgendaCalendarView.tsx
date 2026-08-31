"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronRight,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardAppointmentItem } from "./AppointmentDetailsModal";

interface AgendaCalendarViewProps {
  appointments: DashboardAppointmentItem[];
  currency: string;
  onSelectAppointment: (appointment: DashboardAppointmentItem) => void;
}

export function AgendaCalendarView({
  appointments,
  currency,
  onSelectAppointment,
}: AgendaCalendarViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      (apt.customer?.name && apt.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (apt.service?.name && apt.service.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (apt.staff?.name && apt.staff.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || apt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusVariants: Record<string, "success" | "warning" | "danger" | "default" | "secondary"> = {
    CONFIRMED: "default",
    COMPLETED: "success",
    CANCELLED: "danger",
    NO_SHOW: "warning",
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm p-4 sm:p-6 space-y-4 animate-in fade-in-50 duration-200">
      {/* Search and Status Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search client, service, or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["ALL", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-colors shrink-0 ${
                statusFilter === status
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Appointment Rows List */}
      {filteredAppointments.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            No appointments found
          </p>
          <p className="text-[11px] mt-0.5">
            {searchQuery ? "Try refining your search query." : "No bookings scheduled for this date."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAppointments.map((apt) => {
            const startsAt = new Date(apt.startsAt);
            const endsAt = new Date(apt.endsAt);

            return (
              <div
                key={apt.id}
                onClick={() => onSelectAppointment(apt)}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 hover:border-primary-500/80 hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group"
              >
                {/* Time & Service */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                    <Clock className="h-4 w-4 text-primary-500" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Badge variant={statusVariants[apt.status] || "default"}>
                        {apt.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: apt.service?.color || "#6366f1" }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {apt.service?.name}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        • {formatDuration(apt.service?.durationMin || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Client & Specialist Details */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center sm:justify-end gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{apt.customer?.name}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Staff: <strong className="text-slate-700 dark:text-slate-300">{apt.staff?.name}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {formatPrice(apt.service?.priceCents || 0, currency)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
