"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  CalendarCheck,
  UserX,
  RefreshCcw,
  ShieldAlert,
  Users,
  Scissors,
  ArrowUpRight,
  Clock,
  HelpCircle,
  BarChart3,
  Percent,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AnalyticsSummary {
  totalBookings: number;
  completedCount: number;
  confirmedCount: number;
  cancelledCount: number;
  noShowCount: number;
  completionRate: number;
  noShowRate: number;
  cancellationRate: number;
  grossRevenueCents: number;
  refundsIssuedCents: number;
  netRevenueCents: number;
  projectedRevenueCents: number;
  currency: string;
}

interface StaffMetric {
  id: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  total: number;
  completed: number;
  noShows: number;
  revenueCents: number;
}

interface ServiceMetric {
  id: string;
  name: string;
  color: string | null;
  priceCents: number;
  durationMin: number;
  bookingCount: number;
  revenueCents: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  cancellationBreakdown: {
    customerRefunded: number;
    customerRetainedDeposit: number;
    businessCancelled: number;
    systemExpired: number;
  };
  dailyMetrics: Array<{
    date: string;
    grossCents: number;
    netCents: number;
    bookings: number;
    completed: number;
  }>;
  staffMetrics: StaffMetric[];
  serviceMetrics: ServiceMetric[];
}

interface AnalyticsDashboardProps {
  businessSlug: string;
  initialData?: AnalyticsData | null;
}

export function AnalyticsDashboard({ businessSlug, initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(initialData || null);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");
  const [isLoading, setIsLoading] = useState(!initialData);

  async function fetchAnalytics(tf: "7d" | "30d" | "90d") {
    setIsLoading(true);
    try {
      const now = new Date();
      const days = tf === "7d" ? 7 : tf === "30d" ? 30 : 90;
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(`/api/analytics?slug=${businessSlug}&startDate=${start}&endDate=${end}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const summary = data?.summary;
  const currency = summary?.currency || "USD";

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Header & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-500" />
            <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight">
              Business Intelligence & Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time revenue realization, specialist utilization, and retention metrics.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          {(["7d", "30d", "90d"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === tf
                  ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tf === "7d" ? "Last 7 Days" : tf === "30d" ? "Last 30 Days" : "Last 90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Net Realized Revenue
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              {formatPrice(summary?.netRevenueCents || 0, currency)}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Gross captured minus issued refunds
            </p>
          </div>
        </div>

        {/* Gross Revenue & Refunds */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Gross Captured / Refunds
            </span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              {formatPrice(summary?.grossRevenueCents || 0, currency)}
            </span>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Refunds: {formatPrice(summary?.refundsIssuedCents || 0, currency)}
            </p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completion Rate
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              {summary?.completionRate || 0}%
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary?.completedCount || 0} completed of {(summary?.completedCount || 0) + (summary?.noShowCount || 0) + (summary?.cancelledCount || 0)} finalized
            </p>
          </div>
        </div>

        {/* No-Show Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              No-Show Rate
            </span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white">
              {summary?.noShowRate || 0}%
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary?.noShowCount || 0} missed clients
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Projected Value & Cancellation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projected Pipeline Value */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/10 via-primary-900/5 to-slate-900 border border-primary-500/20 dark:border-primary-500/30 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Pipeline & Projected Value
            </span>
            <h3 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white mt-1">
              {formatPrice(summary?.projectedRevenueCents || 0, currency)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total catalog value of all scheduled and completed appointments in this period.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Active Confirmed</span>
              <span className="font-bold text-slate-900 dark:text-white">{summary?.confirmedCount || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Total Bookings</span>
              <span className="font-bold text-slate-900 dark:text-white">{summary?.totalBookings || 0}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Breakdown Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                Cancellation & Deposit Attribution
              </h3>
              <p className="text-xs text-slate-400">
                Auditing policy enforcement across self-service and front-desk actions.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Total: {summary?.cancelledCount || 0} Cancelled
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Refunded
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-1">
                {data?.cancellationBreakdown?.customerRefunded || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">&gt;= policy notice</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                Deposit Retained
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-1">
                {data?.cancellationBreakdown?.customerRetainedDeposit || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">&lt; refund notice</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Staff Cancelled
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-1">
                {data?.cancellationBreakdown?.businessCancelled || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Dashboard overrides</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Hold Expired
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white block mt-1">
                {data?.cancellationBreakdown?.systemExpired || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">15-min timeout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matrices: Specialist Performance & Service Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specialist Performance */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-500" />
              <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                Specialist Performance
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{data?.staffMetrics?.length || 0} Specialists</span>
          </div>

          <div className="space-y-3">
            {data?.staffMetrics?.map((st) => (
              <div
                key={st.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                    {st.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</h4>
                    <span className="text-[10px] text-slate-400">{st.role || "Specialist"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block">
                    {formatPrice(st.revenueCents, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {st.completed} Completed • {st.noShows} No-Shows
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Popularity */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-primary-500" />
              <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                Service Catalog Performance
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{data?.serviceMetrics?.length || 0} Services</span>
          </div>

          <div className="space-y-3">
            {data?.serviceMetrics?.map((svc) => (
              <div
                key={svc.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                    style={{ backgroundColor: svc.color || "#6366f1" }}
                  >
                    {svc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{svc.name}</h4>
                    <span className="text-[10px] text-slate-400">
                      {svc.durationMin}m • {formatPrice(svc.priceCents, currency)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    {svc.bookingCount} Bookings
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatPrice(svc.revenueCents, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
