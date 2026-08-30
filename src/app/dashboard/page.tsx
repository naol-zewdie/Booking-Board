import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Layers,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import db from "@/lib/db";
import { formatPrice, formatDuration } from "@/lib/utils";
import { minutesToTimeString } from "@/lib/timezones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams?: { b?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const selectedSlug = searchParams?.b;

  // 1. Fetch the business with full relations
  const business = selectedSlug
    ? await db.business.findUnique({
        where: { slug: selectedSlug },
        include: {
          services: { where: { active: true } },
          staff: {
            where: { active: true },
            include: { workingHours: true },
          },
          appointments: {
            include: {
              customer: true,
              service: true,
              staff: true,
            },
            orderBy: { startsAt: "asc" },
          },
          customers: true,
        },
      })
    : await db.business.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          services: { where: { active: true } },
          staff: {
            where: { active: true },
            include: { workingHours: true },
          },
          appointments: {
            include: {
              customer: true,
              service: true,
              staff: true,
            },
            orderBy: { startsAt: "asc" },
          },
          customers: true,
        },
      });

  // Empty state if no business exists
  if (!business) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="h-16 w-16 rounded-3xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center mx-auto mb-4">
          <Layers className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold font-heading">No Business Created Yet</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Get started by setting up your services, working hours, and customized booking link.
        </p>
        <Link href="/onboarding">
          <Button variant="glow" size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span>Launch Onboarding Wizard</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate metrics
  const totalAppointments = business.appointments.length;
  const confirmedAppointments = business.appointments.filter((a: any) => a.status === "CONFIRMED");
  const totalRevenueCents = business.appointments.reduce((sum: number, a: any) => sum + (a.service?.priceCents || 0), 0);
  const activeStaffCount = business.staff.length;
  const activeServicesCount = business.services.length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Glow orb */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-primary-200 mb-1 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-primary-300" />
            <span>Phase 1 • Core Foundation Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
            {business.name}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            {business.description || "Manage your services, staff hours, and appointments in one place."}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link href={`/b/${business.slug}`} target="_blank">
            <Button variant="secondary" size="md" className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
              <span>View Public Page</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button variant="glow" size="md" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>+ Add Business</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bookings Today
                </p>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                  {totalAppointments}
                </h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" /> {confirmedAppointments.length} confirmed
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estimated Value
                </p>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                  {formatPrice(totalRevenueCents, business.currency)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">From active appointments</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active Services
                </p>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                  {activeServicesCount}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Bookable in catalog</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Team Members
                </p>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1">
                  {activeStaffCount}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">With active schedules</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Board Grid: Schedule & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: The Live Calendar Board */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Today&apos;s Appointments</CardTitle>
                <CardDescription>
                  Live schedule board in {business.timezone}
                </CardDescription>
              </div>
              <Badge variant="success">Live Board</Badge>
            </CardHeader>
            <CardContent>
              {business.appointments.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    No appointments scheduled yet today.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Bookings made through your public page will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {business.appointments.map((apt: any) => {
                    const startFormatted = format(new Date(apt.startsAt), "hh:mm a");
                    const endFormatted = format(new Date(apt.endsAt), "hh:mm a");

                    return (
                      <div
                        key={apt.id}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Time & Service */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                            <Clock className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                                {startFormatted} - {endFormatted}
                              </span>
                              <Badge
                                variant={
                                  apt.paymentStatus === "PAID"
                                    ? "success"
                                    : apt.paymentStatus === "DEPOSIT_PAID"
                                    ? "warning"
                                    : "secondary"
                                }
                              >
                                {apt.paymentStatus.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: apt.service?.color || "#6366f1" }}
                              />
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {apt.service?.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                • {formatDuration(apt.service?.durationMin || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customer & Staff Info */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {apt.customer?.name}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center sm:justify-end gap-1 mt-0.5">
                              <span>Staff: {apt.staff?.name}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatPrice(apt.service?.priceCents || 0, business.currency)}
                            </span>
                            <p className="text-[10px] text-emerald-600 font-medium">
                              {apt.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Catalog Preview */}
          <Card className="glass-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Configured Services</CardTitle>
                <CardDescription>
                  Active bookable treatments & buffer rules
                </CardDescription>
              </div>
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                {business.services.length} Total
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {business.services.map((svc: any) => (
                  <div
                    key={svc.id}
                    className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-7 w-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: svc.color || "#6366f1" }}
                      >
                        {svc.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                          {svc.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDuration(svc.durationMin)}
                          {svc.bufferMin > 0 && ` (+${svc.bufferMin}m buffer)`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formatPrice(svc.priceCents, business.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Staff Schedules & Verification Checklist */}
        <div className="space-y-6">
          {/* Staff Roster & Working Hours */}
          <Card className="glass-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Staff & Availability</CardTitle>
              <CardDescription>
                Staff schedules controlling bookable slots
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {business.staff.map((st: any) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-primary-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {st.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {st.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {st.role || "Specialist"}
                      </p>
                    </div>
                  </div>

                  {/* Weekly hours chips */}
                  <div className="pt-1 text-[11px] text-slate-500 space-y-1">
                    <p className="font-semibold text-[10px] uppercase text-slate-400">
                      Active Shifts:
                    </p>
                    {st.workingHours.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No hours defined</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {st.workingHours.map((wh: any) => (
                          <span
                            key={wh.id}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300"
                          >
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][wh.weekday]}:{" "}
                            {minutesToTimeString(wh.startMin)} - {minutesToTimeString(wh.endMin)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Phase 1 Verification Checklist */}
          <Card className="glass-card shadow-sm border-primary-200/50 dark:border-primary-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <ShieldCheck className="h-4 w-4" />
                <CardTitle className="text-sm font-semibold">Phase 1 Architecture Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: "Multi-tenant Database Schema", done: true },
                { label: "UTC Datetime Integrity Layer", done: true },
                { label: "Business Onboarding Engine", done: true },
                { label: "Service & Staff Schedule Models", done: true },
                { label: "Modern Responsive Dashboard Shell", done: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
