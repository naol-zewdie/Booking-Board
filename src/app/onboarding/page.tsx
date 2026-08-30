"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Store,
  Clock,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Globe,
  DollarSign,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  COMMON_TIMEZONES,
  WEEKDAYS,
  minutesToTimeString,
  minutesTo24hTime,
  timeStringToMinutes,
} from "@/lib/timezones";
import { formatPrice, formatDuration } from "@/lib/utils";

interface ServiceItem {
  name: string;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  color: string;
}

interface WorkingHourItem {
  weekday: number;
  startMin: number;
  endMin: number;
  enabled: boolean;
}

interface StaffMember {
  name: string;
  email: string;
  role: string;
  workingHours: WorkingHourItem[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Step 1: Business Details
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [currency, setCurrency] = useState("USD");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Step 2: Services
  const [services, setServices] = useState<ServiceItem[]>([
    {
      name: "Standard Consultation / Service",
      durationMin: 45,
      priceCents: 5000,
      bufferMin: 15,
      color: "#6366f1",
    },
  ]);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServicePrice, setNewServicePrice] = useState(35);
  const [newServiceBuffer, setNewServiceBuffer] = useState(10);
  const [newServiceColor, setNewServiceColor] = useState("#6366f1");

  // Step 3: Staff & Schedule
  const defaultSchedule: WorkingHourItem[] = WEEKDAYS.map((w) => ({
    weekday: w.dayIndex,
    startMin: 540, // 9:00 AM
    endMin: 1020, // 5:00 PM
    enabled: w.dayIndex >= 1 && w.dayIndex <= 5, // Mon-Fri
  }));

  const [staffList, setStaffList] = useState<StaffMember[]>([
    {
      name: "Owner / Primary Specialist",
      email: "owner@mybusiness.com",
      role: "Lead Specialist",
      workingHours: defaultSchedule,
    },
  ]);

  // Step 4: Output
  const [createdBusinessSlug, setCreatedBusinessSlug] = useState("");

  // Auto slugify business name
  useEffect(() => {
    if (!slugEdited && businessName) {
      const generated = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  }, [businessName, slugEdited]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const res = await fetch(`/api/businesses/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugAvailable(data.available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // Add Service Handler
  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    setServices((prev) => [
      ...prev,
      {
        name: newServiceName.trim(),
        durationMin: Number(newServiceDuration),
        priceCents: Math.round(Number(newServicePrice) * 100),
        bufferMin: Number(newServiceBuffer),
        color: newServiceColor,
      },
    ]);

    setNewServiceName("");
    setNewServiceDuration(30);
    setNewServicePrice(35);
    setNewServiceBuffer(10);
  };

  const handleRemoveService = (index: number) => {
    if (services.length <= 1) {
      setErrorMsg("You must keep at least one service.");
      return;
    }
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle Day Working Hours
  const handleToggleDay = (dayIndex: number) => {
    setStaffList((prev) =>
      prev.map((staff, idx) => {
        if (idx !== 0) return staff;
        return {
          ...staff,
          workingHours: staff.workingHours.map((wh) =>
            wh.weekday === dayIndex ? { ...wh, enabled: !wh.enabled } : wh
          ),
        };
      })
    );
  };

  // Change Day Times
  const handleChangeDayTime = (dayIndex: number, type: "start" | "end", time24h: string) => {
    const minutes = timeStringToMinutes(time24h);
    setStaffList((prev) =>
      prev.map((staff, idx) => {
        if (idx !== 0) return staff;
        return {
          ...staff,
          workingHours: staff.workingHours.map((wh) => {
            if (wh.weekday !== dayIndex) return wh;
            return type === "start"
              ? { ...wh, startMin: minutes }
              : { ...wh, endMin: minutes };
          }),
        };
      })
    );
  };

  // Final Submit
  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        businessName,
        slug,
        timezone,
        currency,
        services,
        staff: staffList,
      };

      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create business");
      }

      setCreatedBusinessSlug(slug);
      setStep(4);

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // ignore confetti errors if running in restricted environments
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    const full = `${window.location.origin}/b/${createdBusinessSlug}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Top Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform duration-200">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              BookingBoard
            </span>
          </Link>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Set up your business in minutes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Replace spreadsheets and manual texts with an automated booking board.
          </p>
        </div>

        {/* Progress Stepper */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-slate-200 dark:bg-slate-800 -z-0" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary-600 transition-all duration-300 -z-0"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              />

              {[
                { s: 1, label: "Business Details", icon: Store },
                { s: 2, label: "Services", icon: Clock },
                { s: 3, label: "Schedule", icon: User },
              ].map((st) => {
                const Icon = st.icon;
                const isCurrent = step === st.s;
                const isPassed = step > st.s;

                return (
                  <div key={st.s} className="flex flex-col items-center relative z-10">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-200 ${
                        isCurrent
                          ? "bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-950 shadow-md scale-110"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        isCurrent
                          ? "text-primary-600 dark:text-primary-400 font-semibold"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Setup Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Business Details */}
        {step === 1 && (
          <Card className="glass-card shadow-xl border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle>1. Business Details</CardTitle>
              <CardDescription>
                Define your business brand, your unique booking link slug, and operating timezone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="e.g. Apex Barber & Spa, Horizon Tutoring, Dr. Vance Clinic"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="slug">Public Booking Page URL</Label>
                  {checkingSlug && <span className="text-xs text-slate-400 animate-pulse">Checking...</span>}
                  {!checkingSlug && slugAvailable === true && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Available
                    </span>
                  )}
                  {!checkingSlug && slugAvailable === false && (
                    <span className="text-xs text-rose-600 font-medium">Already taken</span>
                  )}
                </div>
                <div className="flex rounded-xl shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 text-xs font-mono">
                    yourdomain.com/b/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    className="flex-1 min-w-0 block w-full px-3.5 py-2.5 rounded-r-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="my-business"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                      );
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Customers will visit this link directly to book their appointments.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Operating Timezone</Label>
                  <div className="relative">
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Slots and reminders will be calculated based on this zone.
                  </p>
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                  >
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="CAD">CAD ($ - Canadian Dollar)</option>
                    <option value="AUD">AUD ($ - Australian Dollar)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => {
                    if (!businessName.trim()) {
                      setErrorMsg("Please enter your business name.");
                      return;
                    }
                    if (!slug || slug.length < 2) {
                      setErrorMsg("Please provide a valid slug (at least 2 characters).");
                      return;
                    }
                    if (slugAvailable === false) {
                      setErrorMsg("This slug is already taken. Please choose a different one.");
                      return;
                    }
                    setErrorMsg("");
                    setStep(2);
                  }}
                  variant="glow"
                  className="gap-2"
                >
                  <span>Continue to Services</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Services Catalog */}
        {step === 2 && (
          <Card className="glass-card shadow-xl border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle>2. Configure Services</CardTitle>
              <CardDescription>
                Add the treatments or sessions you provide, their durations, buffer times, and prices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Services List */}
              <div className="space-y-3">
                <Label>Your Services ({services.length})</Label>
                <div className="space-y-2.5">
                  {services.map((svc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm"
                          style={{ backgroundColor: svc.color }}
                        >
                          {svc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {svc.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>{formatDuration(svc.durationMin)}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatPrice(svc.priceCents, currency)}
                            </span>
                            {svc.bufferMin > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  +{svc.bufferMin}m buffer
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveService(idx)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Remove service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Service Form */}
              <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  + Add Another Service
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Input
                      placeholder="Service Name (e.g. Deluxe Facial, 60min Guitar Lesson)"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Duration (Minutes)</Label>
                    <select
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (1 hr)</option>
                      <option value={90}>90 minutes (1.5 hr)</option>
                      <option value={120}>120 minutes (2 hr)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Price ({currency})</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Price"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(Number(e.target.value))}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                  </div>
                  <div>
                    <Label>Buffer / Prep Time</Label>
                    <select
                      value={newServiceBuffer}
                      onChange={(e) => setNewServiceBuffer(Number(e.target.value))}
                      className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value={0}>0 min (No buffer)</option>
                      <option value={5}>5 min cleanup</option>
                      <option value={10}>10 min cleanup</option>
                      <option value={15}>15 min cleanup</option>
                      <option value={30}>30 min cleanup</option>
                    </select>
                  </div>
                  <div>
                    <Label>Card Color</Label>
                    <div className="flex items-center gap-2 h-11">
                      {["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewServiceColor(c)}
                          className={`h-7 w-7 rounded-full transition-transform ${
                            newServiceColor === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddService}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-dashed"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Service to List</span>
                </Button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={() => setStep(1)} variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={() => {
                    if (services.length === 0) {
                      setErrorMsg("Please add at least one service.");
                      return;
                    }
                    setErrorMsg("");
                    setStep(3);
                  }}
                  variant="glow"
                  className="gap-2"
                >
                  <span>Continue to Schedule</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Staff & Weekly Working Hours */}
        {step === 3 && (
          <Card className="glass-card shadow-xl border-slate-200/80 dark:border-slate-800">
            <CardHeader>
              <CardTitle>3. Staff & Weekly Availability</CardTitle>
              <CardDescription>
                Set weekly working hours. The availability engine will automatically generate bookable slots based on these hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staffName">Primary Specialist / Your Name</Label>
                  <Input
                    id="staffName"
                    value={staffList[0]?.name || ""}
                    onChange={(e) =>
                      setStaffList((prev) => [
                        { ...prev[0], name: e.target.value },
                        ...prev.slice(1),
                      ])
                    }
                    placeholder="e.g. Dr. Alex Vance"
                  />
                </div>
                <div>
                  <Label htmlFor="staffRole">Role / Title</Label>
                  <Input
                    id="staffRole"
                    value={staffList[0]?.role || ""}
                    onChange={(e) =>
                      setStaffList((prev) => [
                        { ...prev[0], role: e.target.value },
                        ...prev.slice(1),
                      ])
                    }
                    placeholder="e.g. Owner / Senior Stylist"
                  />
                </div>
              </div>

              {/* Weekly Working Hours Grid */}
              <div className="space-y-3">
                <Label>Weekly Working Hours Schedule</Label>
                <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-white/50 dark:bg-slate-900/50">
                  {WEEKDAYS.map((w) => {
                    const wh = staffList[0]?.workingHours.find((h) => h.weekday === w.dayIndex);
                    const isEnabled = wh?.enabled ?? false;

                    return (
                      <div
                        key={w.dayIndex}
                        className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                          isEnabled
                            ? "bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60"
                            : "opacity-50 hover:opacity-75"
                        }`}
                      >
                        <div className="flex items-center gap-3 w-32">
                          <input
                            type="checkbox"
                            id={`day-${w.dayIndex}`}
                            checked={isEnabled}
                            onChange={() => handleToggleDay(w.dayIndex)}
                            className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                          />
                          <label
                            htmlFor={`day-${w.dayIndex}`}
                            className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            {w.name}
                          </label>
                        </div>

                        {isEnabled && wh ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={minutesTo24hTime(wh.startMin)}
                              onChange={(e) =>
                                handleChangeDayTime(w.dayIndex, "start", e.target.value)
                              }
                              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                            />
                            <span className="text-xs text-slate-400 font-medium">to</span>
                            <input
                              type="time"
                              value={minutesTo24hTime(wh.endMin)}
                              onChange={(e) =>
                                handleChangeDayTime(w.dayIndex, "end", e.target.value)
                              }
                              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Day off / Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button onClick={() => setStep(2)} variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  onClick={handleCompleteOnboarding}
                  variant="glow"
                  isLoading={isSubmitting}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Launch Booking Board</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Success & Live Launch */}
        {step === 4 && (
          <Card className="glass-card shadow-2xl border-emerald-500/30 text-center p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
              <Sparkles className="h-8 w-8" />
            </div>

            <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
              🎉 Your Booking Board is Ready!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
              <strong>{businessName}</strong> has been initialized with your custom services, staff schedules, and automatic slot engine.
            </p>

            {/* Public Link Box */}
            <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Your Public Customer Booking Link
                </span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/b/${createdBusinessSlug}`
                      : `/b/${createdBusinessSlug}`
                  }
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
                />
                <Button onClick={copyLink} size="sm" variant="outline" className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/dashboard?b=${createdBusinessSlug}`} className="w-full sm:w-auto">
                <Button variant="glow" size="lg" className="w-full sm:w-auto gap-2">
                  <span>Open Owner Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                href={`/b/${createdBusinessSlug}`}
                target="_blank"
                className="w-full sm:w-auto"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <span>Test Public Booking Page</span>
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
