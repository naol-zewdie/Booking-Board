import React from "react";
import { Settings, Globe, Shield, CreditCard, Bell, Store } from "lucide-react";
import db from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SettingsPageProps {
  searchParams?: { b?: string };
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const selectedSlug = searchParams?.b;

  const business = selectedSlug
    ? await db.business.findUnique({ where: { slug: selectedSlug } })
    : await db.business.findFirst({ orderBy: { createdAt: "desc" } });

  if (!business) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">
          Business Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your business profile, timezone rules, and integrations for {business.name}.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Basic details used across public booking pages and notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Business Name</Label>
                <Input defaultValue={business.name} />
              </div>
              <div>
                <Label>Public Booking URL Slug</Label>
                <Input defaultValue={business.slug} readOnly className="font-mono text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Primary Operating Timezone</Label>
                <Input defaultValue={business.timezone} readOnly className="font-mono text-xs" />
              </div>
              <div>
                <Label>Default Currency</Label>
                <Input defaultValue={business.currency} readOnly />
              </div>
            </div>

            <div>
              <Label>Description / Bio</Label>
              <textarea
                rows={3}
                defaultValue={business.description || ""}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="glow" size="sm">
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Integrations & Notifications</CardTitle>
            <CardDescription>
              Connect Stripe payments and automated SMS/Email reminders (M6 & M7).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Stripe Payment Processing
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Accept deposits and full upfront prepayments on booking.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure (Phase 7)
              </Button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Transactional SMS & Email Reminders
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Send 24h & 2h appointment reminders to prevent no-shows.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure (Phase 6)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
