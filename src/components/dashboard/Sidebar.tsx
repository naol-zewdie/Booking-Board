"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Layers,
  Users,
  UserCheck,
  Settings,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  business?: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  } | null;
}

export function Sidebar({ business }: SidebarProps) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const navItems = [
    {
      name: "The Board",
      href: "/dashboard",
      icon: Calendar,
      exact: true,
      badge: "Today",
    },
    {
      name: "Services",
      href: "/dashboard/services",
      icon: Layers,
    },
    {
      name: "Staff & Hours",
      href: "/dashboard/staff",
      icon: UserCheck,
    },
    {
      name: "Customers",
      href: "/dashboard/customers",
      icon: Users,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const publicUrl = business ? `/b/${business.slug}` : "/onboarding";

  const copyBookingLink = () => {
    if (!business) return;
    const fullUrl = `${window.location.origin}/b/${business.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform duration-200">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-heading font-bold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              BookingBoard
            </span>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-primary-600 dark:text-primary-400">
              v1.0 • Pro
            </span>
          </div>
        </Link>
      </div>

      {/* Active Business Mini Card */}
      {business && (
        <div className="p-3 mx-3 mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/50">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>ACTIVE BUSINESS</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
            {business.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            TZ: {business.timezone}
          </p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-400 dark:text-slate-400 group-hover:text-primary-500"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Public Booking Link Promotion Card */}
      {business && (
        <div className="p-3 mx-3 mb-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-primary-50 dark:from-slate-800/80 dark:to-primary-950/40 border border-primary-100 dark:border-primary-900/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-700 dark:text-primary-300 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary-600" />
            <span>Public Booking Page</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
            Share this link with customers or paste it on your Instagram/website:
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyBookingLink}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy link</span>
                </>
              )}
            </button>
            <Link
              href={publicUrl}
              target="_blank"
              className="p-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors"
              title="Open Public Page"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Owner Profile Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 ring-2 ring-primary-500/20">
            AV
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Alex Vance</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Business Owner</p>
          </div>
        </div>
        <Link
          href="/onboarding"
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
          title="Create another business"
        >
          + New
        </Link>
      </div>
    </aside>
  );
}
