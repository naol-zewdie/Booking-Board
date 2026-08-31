import { Metadata } from "next";
import db from "@/lib/db";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics & Business Intelligence | Booking Board",
  description: "Real-time revenue, completion rates, and specialist utilization analytics.",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const business: any = await (db as any).business.findFirst();

  if (!business) {
    return (
      <div className="p-8 text-center text-slate-500">
        No business found. Please complete onboarding first.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <AnalyticsDashboard businessSlug={business.slug} />
    </div>
  );
}
