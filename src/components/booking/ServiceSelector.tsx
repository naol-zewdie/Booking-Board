"use client";

import React, { useState } from "react";
import { Clock, Search, Check, Sparkles, Layers } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface BookingServiceItem {
  id: string;
  name: string;
  description?: string | null;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  color?: string | null;
  active: boolean;
}

interface ServiceSelectorProps {
  services: BookingServiceItem[];
  selectedService: BookingServiceItem | null;
  onSelectService: (service: BookingServiceItem) => void;
  currency?: string;
}

export function ServiceSelector({
  services,
  selectedService,
  onSelectService,
  currency = "USD",
}: ServiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = services.filter(
    (s) =>
      s.active &&
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
            1. Select a Service
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose the appointment or treatment you would like to book.
          </p>
        </div>

        {services.length > 3 && (
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>

      {filteredServices.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No services match your search
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredServices.map((svc) => {
            const isSelected = selectedService?.id === svc.id;

            return (
              <div
                key={svc.id}
                onClick={() => onSelectService(svc)}
                className={`p-4 sm:p-5 rounded-3xl border text-left cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                  isSelected
                    ? "bg-primary-50/70 dark:bg-primary-950/40 border-primary-500 shadow-md ring-2 ring-primary-500/20"
                    : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 mt-0.5"
                    style={{ backgroundColor: svc.color || "#6366f1" }}
                  >
                    {svc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-heading font-bold text-sm sm:text-base transition-colors ${
                          isSelected
                            ? "text-primary-900 dark:text-primary-200"
                            : "text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400"
                        }`}
                      >
                        {svc.name}
                      </h3>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {svc.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {svc.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 mt-2.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-lg">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatDuration(svc.durationMin)}
                      </span>
                      {svc.bufferMin > 0 && (
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg">
                          +{svc.bufferMin}m buffer
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {formatPrice(svc.priceCents, currency)}
                  </span>
                  <button
                    type="button"
                    className={`h-8 px-3 rounded-xl text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-primary-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary-50 group-hover:text-primary-700 dark:group-hover:bg-primary-950 dark:group-hover:text-primary-300"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
