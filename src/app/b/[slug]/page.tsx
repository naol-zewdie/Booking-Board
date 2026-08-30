import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  ArrowRight,
  Store,
  ExternalLink,
} from "lucide-react";
import db from "@/lib/db";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface PublicBookingPageProps {
  params: { slug: string };
}

export default async function PublicBookingPage({ params }: PublicBookingPageProps) {
  const business = await db.business.findUnique({
    where: { slug: params.slug },
    include: {
      services: { where: { active: true } },
      staff: {
        where: { active: true },
        include: { workingHours: true },
      },
    },
  });

  if (!business) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Business Branding Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online Booking Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
                {business.name}
              </h1>
              {business.description && (
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  {business.description}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right text-xs text-slate-400 space-y-1 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center sm:justify-end gap-1.5 font-medium text-slate-300">
                <Clock className="h-3.5 w-3.5 text-primary-400" />
                <span>Timezone: {business.timezone}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                All appointment times are displayed in this timezone.
              </p>
            </div>
          </div>
        </div>

        {/* Services Menu */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <span>Select a Service</span>
              <Badge variant="default" className="text-[10px]">
                {business.services.length} Available
              </Badge>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {business.services.map((svc: any) => (
              <div
                key={svc.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0 mt-0.5"
                    style={{ backgroundColor: svc.color || "#6366f1" }}
                  >
                    {svc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-white group-hover:text-primary-300 transition-colors">
                      {svc.name}
                    </h3>
                    {svc.description && (
                      <p className="text-xs text-slate-400 mt-1 max-w-lg">
                        {svc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDuration(svc.durationMin)}
                      </span>
                      {svc.bufferMin > 0 && (
                        <span className="text-slate-500 text-[11px]">
                          (+{svc.bufferMin}m buffer)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <span className="text-base font-bold text-emerald-400">
                    {formatPrice(svc.priceCents, business.currency)}
                  </span>
                  <Link
                    href={`/dashboard?b=${business.slug}`}
                    className="inline-flex items-center justify-center font-medium rounded-xl text-xs px-3 py-1.5 gap-1.5 h-8 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white shadow-glow"
                  >
                    <span>Book Service</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Specialists Section */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h2 className="text-lg font-heading font-bold text-white">
            Our Specialists & Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {business.staff.map((st: any) => (
              <div
                key={st.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5"
              >
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {st.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{st.name}</h4>
                  <p className="text-xs text-slate-400">{st.role || "Specialist"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex items-center justify-between">
          <span>Powered by BookingBoard</span>
          <Link href="/dashboard" className="text-primary-400 hover:underline">
            Owner Login & Board →
          </Link>
        </div>
      </div>
    </div>
  );
}
