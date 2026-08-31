"use client";

import React, { useState } from "react";
import {
  X,
  Clock,
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllowedTransitions } from "@/lib/appointments/stateMachine";

export interface DashboardAppointmentItem {
  id: string;
  businessId: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  paymentStatus: string;
  notes?: string | null;
  service?: {
    id: string;
    name: string;
    durationMin: number;
    priceCents: number;
    bufferMin: number;
    color?: string | null;
  };
  staff?: {
    id: string;
    name: string;
    role?: string | null;
    avatarUrl?: string | null;
  };
  customer?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
}

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: DashboardAppointmentItem | null;
  currency: string;
  timezone: string;
  onAppointmentUpdated: (updated: DashboardAppointmentItem) => void;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  currency,
  timezone,
  onAppointmentUpdated,
}: AppointmentDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!appointment) return null;

  const startsAt = new Date(appointment.startsAt);
  const endsAt = new Date(appointment.endsAt);

  async function updateStatus(newStatus: string) {
    if (!appointment) return;
    setIsUpdating(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update appointment status");
      }

      onAppointmentUpdated(data.appointment);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleIssueRefund() {
    if (!appointment) return;
    if (!confirm("Are you sure you want to issue a full refund for this appointment?")) return;

    setIsUpdating(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/refund`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to issue refund");
      }

      onAppointmentUpdated(data.appointment);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue refund");
    } finally {
      setIsUpdating(false);
    }
  }

  const statusVariants: Record<string, "success" | "warning" | "danger" | "default" | "secondary"> = {
    CONFIRMED: "default",
    COMPLETED: "success",
    CANCELLED: "danger",
    NO_SHOW: "warning",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appointment Details" maxWidth="md">
      <div className="space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Header Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
              style={{ backgroundColor: appointment.service?.color || "#6366f1" }}
            >
              {appointment.service?.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                {appointment.service?.name}
              </h3>
              <p className="text-xs text-slate-500">
                with {appointment.staff?.name}
              </p>
            </div>
          </div>

          <Badge variant={statusVariants[appointment.status] || "default"}>
            {appointment.status}
          </Badge>
        </div>

        {/* Time & Duration Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-1">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Scheduled Date
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {startsAt.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-1">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time & Duration
            </span>
            <p className="font-bold text-primary-600 dark:text-primary-400 font-mono">
              {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
              {endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[11px] text-slate-500">
              {formatDuration(appointment.service?.durationMin || 0)}
              {appointment.service?.bufferMin ? ` (+${appointment.service.bufferMin}m buffer)` : ""}
            </p>
          </div>
        </div>

        {/* Client Contact Info */}
        <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Client Information
          </span>
          <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{appointment.customer?.name}</span>
            </p>
            {appointment.customer?.email && (
              <p className="flex items-center gap-2 text-slate-500">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{appointment.customer.email}</span>
              </p>
            )}
            {appointment.customer?.phone && (
              <p className="flex items-center gap-2 text-slate-500">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{appointment.customer.phone}</span>
              </p>
            )}
            {appointment.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-500">Notes:</span> &quot;{appointment.notes}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Price Breakdown & Refund Action */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Price & Billing</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatPrice(appointment.service?.priceCents || 0, currency)}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Status: {appointment.paymentStatus.replace("_", " ")}
            </span>
          </div>

          {(appointment.paymentStatus === "PAID" || appointment.paymentStatus === "DEPOSIT_PAID") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={handleIssueRefund}
              className="text-xs h-8 rounded-xl border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold"
            >
              Issue Full Refund
            </Button>
          )}
        </div>

        {/* Status Action Buttons */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Appointment Status & Actions
          </span>

          {(() => {
            const allowed = getAllowedTransitions(appointment.status);

            if (allowed.length === 0) {
              return (
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>
                    Terminal state (<strong>{appointment.status}</strong>). This appointment is finalized.
                  </span>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {allowed.includes("COMPLETED") && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => updateStatus("COMPLETED")}
                    className="text-xs h-9 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 rounded-xl"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark Completed</span>
                  </Button>
                )}

                {allowed.includes("NO_SHOW") && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => updateStatus("NO_SHOW")}
                    className="text-xs h-9 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-900 rounded-xl"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Mark No-Show</span>
                  </Button>
                )}

                {allowed.includes("CANCELLED") && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => updateStatus("CANCELLED")}
                    className="text-xs h-9 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 rounded-xl"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel Booking</span>
                  </Button>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </Modal>
  );
}
