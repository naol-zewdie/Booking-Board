import { Metadata } from "next";
import db from "@/lib/db";
import { SettingsView } from "@/components/dashboard/SettingsView";

export const metadata: Metadata = {
  title: "Business Settings & Policies | Booking Board",
  description: "Configure operating policies, deposit rules, and customer cancellation cutoffs.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const business: any = await (db as any).business.findFirst();

  if (!business) {
    return (
      <div className="p-8 text-center text-slate-500">
        No business found. Please complete onboarding first.
      </div>
    );
  }

  const initialSettings = {
    id: business.id,
    name: business.name,
    slug: business.slug,
    description: business.description,
    timezone: business.timezone,
    currency: business.currency,
    cancellationNoticeHours: business.cancellationNoticeHours ?? 2,
    refundNoticeHours: business.refundNoticeHours ?? 24,
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <SettingsView initialSettings={initialSettings} />
    </div>
  );
}
