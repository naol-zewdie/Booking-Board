import React from "react";
import db from "@/lib/db";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Navbar } from "@/components/dashboard/Navbar";

export const dynamic = "force-dynamic";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: { slug?: string };
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Fetch all businesses for switching
  const allBusinesses = await db.business.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
    },
  });

  const activeBusiness = allBusinesses[0] || null;

  return (
    <div className="min-h-screen flex bg-slate-50/60 dark:bg-slate-950 font-sans">
      {/* Sidebar */}
      <Sidebar business={activeBusiness} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentBusiness={activeBusiness}
          allBusinesses={allBusinesses}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
