import React from "react";
import { Users, Mail, Phone, Calendar, Clock } from "lucide-react";
import db from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface CustomersPageProps {
  searchParams?: { b?: string };
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const selectedSlug = searchParams?.b;

  const business = selectedSlug
    ? await db.business.findUnique({
        where: { slug: selectedSlug },
        include: {
          customers: {
            include: {
              appointments: {
                include: { service: true },
                orderBy: { startsAt: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    : await db.business.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          customers: {
            include: {
              appointments: {
                include: { service: true },
                orderBy: { startsAt: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

  if (!business) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">
          Customer Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Clients who booked services with {business.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {business.customers.map((cust: any) => (
          <div
            key={cust.id}
            className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                {cust.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {cust.name}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {cust.appointments.length} Total Bookings
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              {cust.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{cust.email}</span>
                </p>
              )}
              {cust.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{cust.phone}</span>
                </p>
              )}
            </div>

            {cust.notes && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                &quot;{cust.notes}&quot;
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
