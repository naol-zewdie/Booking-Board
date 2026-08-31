"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Calendar as CalendarIcon,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookingServiceItem } from "./ServiceSelector";
import { BookingStaffItem } from "./StaffSelector";
import { ResolvedSlot } from "./SlotPicker";

interface CustomerIntakeFormProps {
  businessSlug: string;
  businessName: string;
  businessTimezone: string;
  currency: string;
  service: BookingServiceItem;
  staff: BookingStaffItem | null;
  slot: ResolvedSlot;
  onBookingSuccess: (appointment: any) => void;
  onSlotCollision: (message: string) => void;
}

export function CustomerIntakeForm({
  businessSlug,
  businessName,
  businessTimezone,
  currency,
  service,
  staff,
  slot,
  onBookingSuccess,
  onSlotCollision,
}: CustomerIntakeFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const resolvedStaffName = staff?.name || slot.staffName || "Specialist";
  const resolvedStaffId = staff?.id || slot.staffId;

  function validate() {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        serviceId: service.id,
        staffId: resolvedStaffId, // specific resolved staffId
        startsAt: slot.startsAt,
        notes: formData.notes.trim() || null,
        customer: {
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
        },
      };

      const res = await fetch(`/api/businesses/${businessSlug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Double-booking race condition: Auto-recover back to Step 3
        onSlotCollision(
          data.error || "That time slot was just booked by someone else! Please pick another open time."
        );
        return;
      }

      if (data.requiresPayment && data.checkoutUrl) {
        // Redirect to secure Stripe Checkout Session
        window.location.href = data.checkoutUrl;
        return;
      }

      onBookingSuccess(data.appointment);
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div>
        <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
          4. Review & Customer Details
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your contact information to receive your instant booking confirmation.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contact Intake Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-4">
            <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-white">
              Contact Information
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Sarah Jenkins"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                }}
                icon={<User className="h-4 w-4" />}
                className={formErrors.name ? "border-rose-500 ring-1 ring-rose-500" : ""}
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address <span className="text-slate-400 font-normal">(for calendar invite)</span>
              </label>
              <Input
                type="email"
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                }}
                icon={<Mail className="h-4 w-4" />}
                className={formErrors.email ? "border-rose-500 ring-1 ring-rose-500" : ""}
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number <span className="text-slate-400 font-normal">(optional SMS notifications)</span>
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                icon={<Phone className="h-4 w-4" />}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Special Requests / Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Any preferences, allergies, or notes for the specialist..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl text-sm font-bold bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white shadow-glow flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {service.paymentRequirement === "DEPOSIT" ? (
                  <span>
                    Pay {formatPrice(service.depositAmountCents || Math.round(service.priceCents * 0.3), currency)} Deposit & Reserve
                  </span>
                ) : service.paymentRequirement === "FULL" ? (
                  <span>
                    Pay {formatPrice(service.priceCents, currency)} & Book
                  </span>
                ) : (
                  <span>Confirm & Book Appointment</span>
                )}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Right 1 Col: Live Order Summary Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  Booking Summary
                </span>
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                  {businessName}
                </h3>
              </div>
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                style={{ backgroundColor: service.color || "#6366f1" }}
              >
                {service.name.slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Service */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Treatment</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">
                  {service.name}
                </span>
              </div>

              {/* Specialist */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Specialist</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {resolvedStaffName}
                </span>
              </div>

              {/* Date & Time */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                  {slot.formattedDate}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Time</span>
                <span className="font-bold text-primary-600 dark:text-primary-400 font-mono text-right">
                  {slot.formattedTime}
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatDuration(service.durationMin)}
                </span>
              </div>

              {/* Timezone */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Timezone</span>
                <span className="font-mono text-slate-500">{businessTimezone}</span>
              </div>
            </div>

            {/* Total Price & Deposit Breakdown */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Service Price</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {formatPrice(service.priceCents, currency)}
                </span>
              </div>

              {service.paymentRequirement === "DEPOSIT" && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="font-bold text-xs text-primary-600 dark:text-primary-400">
                    Deposit Due Today
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(service.depositAmountCents || Math.round(service.priceCents * 0.3), currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Instant confirmation • Free cancellation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
