"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Shield,
  Clock,
  DollarSign,
  Globe,
  Building,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BusinessSettingsData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  timezone: string;
  currency: string;
  cancellationNoticeHours: number;
  refundNoticeHours: number;
}

interface SettingsViewProps {
  initialSettings: BusinessSettingsData;
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const [formData, setFormData] = useState<BusinessSettingsData>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/businesses/${formData.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          timezone: formData.timezone,
          currency: formData.currency,
          cancellationNoticeHours: Number(formData.cancellationNoticeHours),
          refundNoticeHours: Number(formData.refundNoticeHours),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setFormData(data.business);
      setSuccessMsg("Settings and cancellation policies updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-300">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary-500" />
          <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight">
            Business Settings & Cancellation Policies
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure operating policies, deposit rules, and customer cancellation notice cutoffs.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Cancellation & Refund Policies */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Shield className="h-5 w-5 text-primary-500" />
            <h2 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              Automated Cancellation & Refund Rules
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Minimum Notice for Online Cancellation */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Online Cancellation Cutoff (Hours)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  min="0"
                  max="168"
                  value={formData.cancellationNoticeHours}
                  onChange={(e) =>
                    setFormData({ ...formData, cancellationNoticeHours: Number(e.target.value) })
                  }
                  className="pl-9 font-mono text-xs rounded-xl"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Minimum hours before appointment start a customer is allowed to cancel online.
              </p>
            </div>

            {/* Minimum Notice for Deposit Refund */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Refund Window (Hours)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  min="0"
                  max="168"
                  value={formData.refundNoticeHours}
                  onChange={(e) =>
                    setFormData({ ...formData, refundNoticeHours: Number(e.target.value) })
                  }
                  className="pl-9 font-mono text-xs rounded-xl"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Minimum advance notice required to receive an automatic full deposit refund.
              </p>
            </div>
          </div>

          {/* Client-Side Computed Live Preview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-900/10 via-slate-900 to-indigo-900/10 border border-primary-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-bold text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Live Policy Preview (What Customers See)</span>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed">
              <p>
                • Customers can self-service cancel online up to <strong>{formData.cancellationNoticeHours} hours</strong> before their start time.
              </p>
              <p>
                • Cancellations submitted <strong>&gt;= {formData.refundNoticeHours} hours</strong> in advance automatically trigger a <strong>full deposit refund</strong>.
              </p>
              <p>
                • Late cancellations (&lt; {formData.refundNoticeHours}h notice) will have their deposit <strong>retained</strong> per business policy.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Business Profile & Localization */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building className="h-5 w-5 text-primary-500" />
            <h2 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
              Business Profile & Localization
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Business Name
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Public Booking Slug
              </label>
              <Input
                type="text"
                value={formData.slug}
                disabled
                className="text-xs rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Operating Timezone (IANA)
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="pl-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Currency
              </label>
              <Input
                type="text"
                maxLength={3}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                className="text-xs rounded-xl font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="h-11 px-6 rounded-2xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-glow flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Policies...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save All Changes</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
