"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  ChevronDown,
  Plus,
  ExternalLink,
  Calendar as CalendarIcon,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

interface NavbarProps {
  currentBusiness?: BusinessItem | null;
  allBusinesses?: BusinessItem[];
}

export function Navbar({ currentBusiness, allBusinesses = [] }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleSelectBusiness = (slug: string) => {
    setDropdownOpen(false);
    router.push(`/dashboard?b=${slug}`);
  };

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Business Switcher */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors text-sm font-semibold text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60"
          >
            <div className="h-6 w-6 rounded-lg bg-primary-600/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Store className="h-3.5 w-3.5" />
            </div>
            <span className="max-w-[180px] truncate">
              {currentBusiness ? currentBusiness.name : "Select Business"}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {/* Business Switcher Dropdown */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Your Businesses
                </div>
                {allBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBusiness(b.slug)}
                    className="w-full text-left px-3.5 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors text-slate-800 dark:text-slate-200"
                  >
                    <span className="truncate">{b.name}</span>
                    {currentBusiness?.id === b.id && (
                      <Check className="h-4 w-4 text-primary-600 shrink-0" />
                    )}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  href="/onboarding"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Business</span>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
          <CalendarIcon className="h-3.5 w-3.5 text-primary-500" />
          <span>{todayStr}</span>
          {currentBusiness && (
            <span className="text-slate-400 dark:text-slate-500">
              • {currentBusiness.timezone.split("/")[1]?.replace("_", " ") || currentBusiness.timezone}
            </span>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {currentBusiness && (
          <Link
            href={`/b/${currentBusiness.slug}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors"
          >
            <span>Live Booking Page</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        )}

        <Button
          variant="glow"
          size="sm"
          onClick={() => {
            alert("Phase 1 preview: Interactive booking engine & calendar board is ready to create bookings!");
          }}
          className="gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </Button>
      </div>
    </header>
  );
}
