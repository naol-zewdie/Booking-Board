"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  Building,
  Clock,
  Sparkles,
} from "lucide-react";
import { ServiceSelector, BookingServiceItem } from "./ServiceSelector";
import { StaffSelector, BookingStaffItem } from "./StaffSelector";
import { SlotPicker, ResolvedSlot } from "./SlotPicker";
import { CustomerIntakeForm } from "./CustomerIntakeForm";
import { BookingConfirmation } from "./BookingConfirmation";
import { Badge } from "@/components/ui/badge";

export interface BookingBusinessData {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  description?: string | null;
  services: BookingServiceItem[];
  staff: BookingStaffItem[];
}

interface BookingFlowProps {
  business: BookingBusinessData;
}

export function BookingFlow({ business }: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<BookingServiceItem | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<BookingStaffItem | null>(null); // null = "Any Available"
  const [selectedSlot, setSelectedSlot] = useState<ResolvedSlot | null>(null);
  const [collisionAlert, setCollisionAlert] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);

  // Step 1: Service Selected -> Advance to Step 2
  function handleSelectService(svc: BookingServiceItem) {
    setSelectedService(svc);
    // If business has only 1 staff member, auto-select them and go straight to Step 3
    if (business.staff.length === 1) {
      setSelectedStaff(business.staff[0]);
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  }

  // Step 2: Staff Selected -> Advance to Step 3
  function handleSelectStaff(st: BookingStaffItem | null) {
    setSelectedStaff(st);
    setCurrentStep(3);
  }

  // Step 3: Slot Selected -> Advance to Step 4
  function handleSelectSlot(slot: ResolvedSlot) {
    setSelectedSlot(slot);
    setCollisionAlert(null);
    setCurrentStep(4);
  }

  // Step 4: 409 Collision Auto-Recovery -> Return to Step 3
  function handleSlotCollision(message: string) {
    setCollisionAlert(message);
    setSelectedSlot(null);
    setCurrentStep(3);
  }

  // Step 4: Booking Successful -> Advance to Step 5
  function handleBookingSuccess(appointment: any) {
    setConfirmedAppointment(appointment);
    setCurrentStep(5);
  }

  // Step 5: Book Another Appointment -> Reset to Step 1
  function handleBookAnother() {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedSlot(null);
    setCollisionAlert(null);
    setConfirmedAppointment(null);
    setCurrentStep(1);
  }

  // Step Navigation Back
  function handleBack() {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      if (business.staff.length === 1) {
        setCurrentStep(1);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 4) {
      setCurrentStep(3);
    }
  }

  const stepsList = [
    { num: 1, label: "Service" },
    { num: 2, label: "Specialist" },
    { num: 3, label: "Date & Time" },
    { num: 4, label: "Confirm" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-primary-500/30 selection:text-primary-200">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStep > 1 && currentStep < 5 && (
              <button
                type="button"
                onClick={handleBack}
                className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary-400" />
                <h1 className="font-heading font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {business.name}
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Online Appointment Scheduling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-[11px] font-mono">
              {business.timezone}
            </Badge>

            <Link
              href={`/dashboard?b=${business.slug}`}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline"
            >
              Owner Portal →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full">
        {/* Step Progress Bar (Steps 1-4) */}
        {currentStep < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 w-full z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-primary-600 to-indigo-600 transition-all duration-300 z-0"
                style={{
                  width: `${((currentStep - 1) / (stepsList.length - 1)) * 100}%`,
                }}
              />

              {stepsList.map((step) => {
                const isCompleted = currentStep > step.num;
                const isCurrent = currentStep === step.num;

                return (
                  <div key={step.num} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                        isCompleted
                          ? "bg-primary-600 text-white shadow-sm ring-4 ring-slate-950"
                          : isCurrent
                          ? "bg-slate-900 border-2 border-primary-500 text-primary-400 shadow-glow ring-4 ring-slate-950"
                          : "bg-slate-900 border border-slate-800 text-slate-500 ring-4 ring-slate-950"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : step.num}
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-1.5 uppercase tracking-wider hidden sm:block ${
                        isCurrent
                          ? "text-primary-400"
                          : isCompleted
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Step View */}
        {currentStep === 1 && (
          <ServiceSelector
            services={business.services}
            selectedService={selectedService}
            onSelectService={handleSelectService}
            currency={business.currency}
          />
        )}

        {currentStep === 2 && selectedService && (
          <StaffSelector
            staffList={business.staff}
            selectedStaff={selectedStaff}
            selectedServiceId={selectedService.id}
            onSelectStaff={handleSelectStaff}
          />
        )}

        {currentStep === 3 && selectedService && (
          <SlotPicker
            businessSlug={business.slug}
            businessTimezone={business.timezone}
            service={selectedService}
            staff={selectedStaff}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
            collisionAlert={collisionAlert}
          />
        )}

        {currentStep === 4 && selectedService && selectedSlot && (
          <CustomerIntakeForm
            businessSlug={business.slug}
            businessName={business.name}
            businessTimezone={business.timezone}
            currency={business.currency}
            service={selectedService}
            staff={selectedStaff}
            slot={selectedSlot}
            onBookingSuccess={handleBookingSuccess}
            onSlotCollision={handleSlotCollision}
          />
        )}

        {currentStep === 5 && confirmedAppointment && (
          <BookingConfirmation
            businessSlug={business.slug}
            businessName={business.name}
            businessTimezone={business.timezone}
            currency={business.currency}
            appointment={confirmedAppointment}
            onBookAnother={handleBookAnother}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Powered by <strong>BookingBoard</strong></span>
          <div className="flex items-center gap-4">
            <span>Instant Confirmation</span>
            <span>•</span>
            <span>No Account Required</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
