"use client";

import React, { useState } from "react";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ServiceModal, ServiceData } from "./ServiceModal";
import { formatPrice, formatDuration } from "@/lib/utils";

export interface ServiceItem extends ServiceData {
  id: string;
  createdAt: string;
  _count?: {
    appointments: number;
  };
}

interface ServicesManagerProps {
  initialServices: ServiceItem[];
  currency?: string;
  businessId: string;
}

export function ServicesManager({
  initialServices,
  currency = "USD",
  businessId,
}: ServicesManagerProps) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  // Deactivate safety alert modal state
  const [deactivateModalData, setDeactivateModalData] = useState<{
    service: ServiceItem;
    appointmentCount: number;
    message: string;
  } | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filter services
  const filteredServices = services.filter((svc) => {
    const matchesSearch =
      svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (svc.description && svc.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterActive === "active") return matchesSearch && svc.active;
    if (filterActive === "inactive") return matchesSearch && !svc.active;
    return matchesSearch;
  });

  // Instant Active Toggle with optimistic update
  const handleToggleActive = async (service: ServiceItem) => {
    const newActiveState = !service.active;

    // Optimistic UI update
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, active: newActiveState } : s))
    );

    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActiveState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      // Revert optimistic update on failure
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, active: service.active } : s))
      );
      alert("Failed to update service active status. Please try again.");
    }
  };

  // Delete Handler with 409 check
  const handleDeleteService = async (service: ServiceItem) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.status === 409) {
        // Appointments exist -> Show safety deactivation modal
        setDeactivateModalData({
          service,
          appointmentCount: data.appointmentCount,
          message: data.error,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete service");
      }

      // Successful hard delete
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete service.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 1-Click Soft Deactivate from safety modal
  const handleConfirmDeactivate = async () => {
    if (!deactivateModalData) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/services/${deactivateModalData.service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      if (!res.ok) {
        throw new Error("Failed to deactivate service");
      }

      setServices((prev) =>
        prev.map((s) =>
          s.id === deactivateModalData.service.id ? { ...s, active: false } : s
        )
      );

      setDeactivateModalData(null);
    } catch (err: any) {
      alert(err.message || "Failed to deactivate service.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSavedService = (saved: ServiceData) => {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      if (exists) {
        return prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s));
      }
      return [...prev, saved as ServiceItem];
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">
            Services Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage treatments, appointment durations, pricing, and cleanup buffer gaps.
          </p>
        </div>

        <Button
          onClick={() => {
            setServiceToEdit(null);
            setIsModalOpen(true);
          }}
          variant="glow"
          size="md"
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Service</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(["all", "active", "inactive"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterActive(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filterActive === mode
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {mode} ({services.filter((s) => mode === "all" || (mode === "active" ? s.active : !s.active)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 max-w-md mx-auto p-6">
          <div className="h-14 w-14 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No services found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
            {searchQuery
              ? "No services match your search query."
              : "Get started by adding your first service to your booking catalog."}
          </p>
          <Button
            onClick={() => {
              setServiceToEdit(null);
              setIsModalOpen(true);
            }}
            variant="glow"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Service</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between group ${
                svc.active
                  ? "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md"
                  : "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200/50 dark:border-slate-800/50 opacity-75"
              }`}
            >
              <div>
                {/* Top Row: Color Tag & Active Switch */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm"
                      style={{ backgroundColor: svc.color || "#6366f1" }}
                    />
                    <Badge variant={svc.active ? "success" : "secondary"}>
                      {svc.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Instant Active Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer" title="Toggle active status">
                    <input
                      type="checkbox"
                      checked={svc.active}
                      onChange={() => handleToggleActive(svc)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>

                {/* Service Name & Description */}
                <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {svc.name}
                </h3>
                {svc.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {svc.description}
                  </p>
                )}

                {/* Details Chips */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl">
                    <Clock className="h-3.5 w-3.5 text-primary-500" />
                    <span>{formatDuration(svc.durationMin)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-xl border border-emerald-200/40 dark:border-emerald-800/30">
                    <span>{formatPrice(svc.priceCents, currency)}</span>
                  </div>

                  {svc.bufferMin > 0 && (
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg">
                      +{svc.bufferMin}m buffer
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  {svc._count?.appointments ?? 0} appointment{(svc._count?.appointments ?? 0) === 1 ? "" : "s"}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setServiceToEdit(svc);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Service"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteService(svc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setServiceToEdit(null);
        }}
        onSaved={handleSavedService}
        serviceToEdit={serviceToEdit}
        currency={currency}
        businessId={businessId}
      />

      {/* Deactivation Suggestion Modal (Triggered when 409 Conflict returned on Delete) */}
      {deactivateModalData && (
        <Modal
          isOpen={true}
          onClose={() => setDeactivateModalData(null)}
          title="Cannot Delete Service with History"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>&quot;{deactivateModalData.service.name}&quot;</strong> has{" "}
                <strong>{deactivateModalData.appointmentCount}</strong> associated past/upcoming appointment(s).
                <p className="mt-1">
                  Hard-deleting this service would corrupt historical reporting. Instead, you can <strong>deactivate</strong> it so customers can no longer book it.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeactivateModalData(null)}
              >
                Keep Active
              </Button>
              <Button
                variant="secondary"
                size="sm"
                isLoading={isActionLoading}
                onClick={handleConfirmDeactivate}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Deactivate Service Now</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
