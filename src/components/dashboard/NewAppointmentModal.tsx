"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResolvedSlot } from "@/components/booking/SlotPicker";

interface ServiceItem {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  color?: string | null;
}

interface StaffItem {
  id: string;
  name: string;
  role?: string | null;
  serviceIds?: string[];
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessSlug: string;
  businessTimezone: string;
  currency: string;
  services: ServiceItem[];
  staffList: StaffItem[];
  defaultDate?: string;
  onAppointmentCreated: (appointment: any) => void;
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  businessSlug,
  businessTimezone,
  currency,
  services,
  staffList,
  defaultDate,
  onAppointmentCreated,
}: NewAppointmentModalProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || "");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    defaultDate || new Date().toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<ResolvedSlot[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filter staff by selected service
  const eligibleStaff = staffList.filter((st) => {
    if (!selectedServiceId || !st.serviceIds || st.serviceIds.length === 0) return true;
    return st.serviceIds.includes(selectedServiceId);
  });

  // Fetch available slots when service, staff, or date changes
  useEffect(() => {
    if (!isOpen || !selectedServiceId || !selectedDate) return;

    let isCancelled = false;
    setIsLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlotTime("");

    async function fetchSlots() {
      try {
        const staffParam = selectedStaffId ? `&staffId=${selectedStaffId}` : "";
        const res = await fetch(
          `/api/businesses/${businessSlug}/availability?serviceId=${selectedServiceId}&date=${selectedDate}${staffParam}`
        );
        const data = await res.json();

        if (!isCancelled && res.ok) {
          setAvailableSlots(data.slots || []);
          if (data.slots && data.slots.length > 0) {
            setSelectedSlotTime(data.slots[0].startsAt);
          }
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
      } finally {
        if (!isCancelled) setIsLoadingSlots(false);
      }
    }

    fetchSlots();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedServiceId, selectedStaffId, selectedDate, businessSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMessage("Customer name is required.");
      return;
    }
    if (!selectedSlotTime) {
      setErrorMessage("Please select an available appointment time slot.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const chosenSlot = availableSlots.find((s) => s.startsAt === selectedSlotTime);
      const targetStaffId = selectedStaffId || chosenSlot?.staffId;

      const payload = {
        serviceId: selectedServiceId,
        staffId: targetStaffId,
        startsAt: selectedSlotTime,
        notes: notes.trim() || null,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim() || null,
          email: customerEmail.trim() || null,
        },
      };

      const res = await fetch(`/api/businesses/${businessSlug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create appointment.");
      }

      onAppointmentCreated(data.appointment);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to book appointment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedService = services.find((s) => s.id === selectedServiceId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Walk-In / New Appointment" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Service Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Service <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full h-10 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} ({formatDuration(svc.durationMin)} • {formatPrice(svc.priceCents, currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Staff Specialist Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Specialist / Provider
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full h-10 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Any Available Specialist</option>
              {eligibleStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.role || "Specialist"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Time Slot Grid */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Appointment Date
            </label>
            <span className="text-[11px] text-slate-400 font-mono">{businessTimezone}</span>
          </div>

          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-48 h-9 text-xs"
            />
            {selectedService && (
              <span className="text-slate-500 text-[11px]">
                {formatDuration(selectedService.durationMin)} + {selectedService.bufferMin}m buffer
              </span>
            )}
          </div>

          {/* Time Slots */}
          <div className="space-y-1.5 pt-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Select Start Time
            </label>
            {isLoadingSlots ? (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                <span>Checking available slots...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-slate-400 py-3 text-center italic bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No open slots found on this date.
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlotTime === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      onClick={() => setSelectedSlotTime(slot.startsAt)}
                      className={`h-8 px-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        isSelected
                          ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:border-primary-500"
                      }`}
                    >
                      {slot.formattedTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Customer Intake Info */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-400 block">
            Customer Information
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Client Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Full Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                icon={<User className="h-3.5 w-3.5" />}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                icon={<Phone className="h-3.5 w-3.5" />}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                icon={<Mail className="h-3.5 w-3.5" />}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Notes / Requests
            </label>
            <Input
              placeholder="Walk-in client / phone booking notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs h-9">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedSlotTime}
            className="rounded-xl text-xs h-9 bg-primary-600 hover:bg-primary-500 text-white font-bold gap-2 shadow-glow"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creating Booking...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Confirm Walk-in Booking</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
