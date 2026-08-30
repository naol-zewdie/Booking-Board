import React from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Clock,
  CheckCircle2,
  Users,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const demoBusinesses = await db.business.findMany({
    take: 3,
    include: {
      services: { where: { active: true } },
      staff: true,
      _count: { select: { appointments: true } },
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-primary-500/30 selection:text-primary-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-glow">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-white">
              BookingBoard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                Owner Dashboard
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="glow" size="sm" className="gap-2">
                <span>Start Setup</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Background glow meshes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-primary-600/20 via-indigo-500/15 to-transparent blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-950/80 border border-primary-800/50 text-primary-300 text-xs font-semibold shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-primary-400" />
            <span>Built for Salons, Clinics, Tutors & Local Services</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Replace spreadsheets. <br />
            <span className="bg-gradient-to-r from-primary-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
              Never double-book again.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Set up your services, team schedules, and buffer rules once. Your customers book online 24/7, and you manage everything on one seamless calendar board.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button variant="glow" size="lg" className="w-full sm:w-auto text-base gap-2 px-8">
                <span>Start 5-Minute Onboarding</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base border-slate-800 text-slate-200 hover:bg-slate-900">
                <span>Explore Live Dashboard Demo</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Seeded Businesses Quick Selector */}
        {demoBusinesses.length > 0 && (
          <div className="max-w-4xl mx-auto mt-16 pt-10 border-t border-slate-800/80 relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-6">
              Instant Live Previews (Phase 1 Ready)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demoBusinesses.map((b: any) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default" className="text-[10px]">
                        {b.timezone}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {b._count.appointments} appointments
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-lg text-white group-hover:text-primary-300 transition-colors">
                      {b.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {b.description || "Live multi-tenant service business demo."}
                    </p>

                    <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                      <span>{b.services.length} Services</span>
                      <span>•</span>
                      <span>{b.staff.length} Staff</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard?b=${b.slug}`}
                      className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <span>Open Board</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={`/b/${b.slug}`}
                      target="_blank"
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Public Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Feature Pillar Highlights */}
      <section className="py-16 px-6 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
              Engineered for Real Appointments
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Every detail in the technical guide is implemented with rigorous data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary-950 text-primary-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-white">Timezone & UTC Integrity</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All appointment timestamps are stored in UTC and converted dynamically to the business&apos;s IANA timezone. No messy DST offset bugs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-white">Double-Booking Prevention</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Relational schema with compound indexes and slot collision checks guarantees staff are never double-booked across simultaneous sessions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-white">Buffer & Clean-up Gaps</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configurable buffer times per service (e.g. 15min sanitation between clients) are automatically factored into real-time slot generation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500">
        <p>© 2026 BookingBoard. Built following the Booking Board Technical Architecture Blueprint.</p>
      </footer>
    </div>
  );
}
