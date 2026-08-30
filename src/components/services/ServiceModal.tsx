"use client";

import React, { useState, useEffect } from "react";
import { DollarSign, Clock, Layers, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CURATED_SERVICE_COLORS } from "@/lib/validations/service";

export interface ServiceData {
  id?: string;
  name: string;
  description?: string | null;
  durationMin: number;
  priceCents: number;
  bufferMin: number;
  color: string;
  active: boolean;
}

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (service: ServiceData) => void;
  serviceToEdit?: ServiceData | null;
  currency?: string;
  businessId?: string;
}

export function ServiceModal({
  isOpen,
  onClose,
  onSaved,
  serviceToEdit,
  currency = "USD",
  businessId,
}: ServiceModalProps) {
  const isEditing = Boolean(serviceToEdit?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [priceDollars, setPriceDollars] = useState(35);
  const [bufferMin, setBufferMin] = useState(10);
  const [color, setColor] = useState("#6366f1");
  const [active, setActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state when modal opens or serviceToEdit changes
  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setDescription(serviceToEdit.description || "");
      setDurationMin(serviceToEdit.durationMin);
      setPriceDollars(serviceToEdit.priceCents / 100);
      setBufferMin(serviceToEdit.bufferMin);
      setColor(serviceToEdit.color || "#6366f1");
      setActive(serviceToEdit.active);
    } else {
      setName("");
      setDescription("");
      setDurationMin(30);
      setPriceDollars(35);
      setBufferMin(10);
      setColor("#6366f1");
      setActive(true);
    }
    setErrorMsg("");
  }, [serviceToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a service name.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        durationMin: Number(durationMin),
        priceCents: Math.round(Number(priceDollars) * 100),
        bufferMin: Number(bufferMin),
        color,
        active,
      };

      const url = isEditing
        ? `/api/services/${serviceToEdit!.id}`
        : `/api/services${businessId ? `?businessId=${businessId}` : ""}`;

      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save service");
      }

      onSaved(data.service);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Service" : "Add New Service"}
      description={
        isEditing
          ? "Update service pricing, duration, or buffer gap."
          : "Add a bookable treatment or appointment option to your catalog."
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div>
          <Label htmlFor="service-name">Service Name *</Label>
          <Input
            id="service-name"
            placeholder="e.g. Classic Haircut & Style, Deep Tissue Massage"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="service-desc">Description (Optional)</Label>
          <textarea
            id="service-desc"
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            placeholder="Details shown to customers during booking..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Duration & Price Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="service-duration">Duration (Minutes)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="service-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMin(mins)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                    durationMin === mins
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="service-price">Price ({currency})</Label>
            <Input
              id="service-price"
              type="number"
              min={0}
              step={1}
              value={priceDollars}
              onChange={(e) => setPriceDollars(Number(e.target.value))}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Stored as integer cents in database.
            </p>
          </div>
        </div>

        {/* Buffer Time & Color Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="service-buffer">Buffer / Prep Gap (Min)</Label>
            <select
              id="service-buffer"
              value={bufferMin}
              onChange={(e) => setBufferMin(Number(e.target.value))}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              <option value={0}>0 min (No cleanup)</option>
              <option value={5}>5 min cleanup gap</option>
              <option value={10}>10 min cleanup gap</option>
              <option value={15}>15 min cleanup gap</option>
              <option value={20}>20 min cleanup gap</option>
              <option value={30}>30 min cleanup gap</option>
            </select>
          </div>

          <div>
            <Label>Calendar Board Color Tag</Label>
            <div className="flex items-center gap-2 h-11">
              {CURATED_SERVICE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c.hex
                      ? "ring-2 ring-offset-2 ring-primary-500 scale-110 shadow-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Active in Public Catalog
            </p>
            <p className="text-[10px] text-slate-500">
              When inactive, the service is hidden from new bookings but preserved in history.
            </p>
          </div>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="glow" isLoading={isLoading} className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            <span>{isEditing ? "Save Changes" : "Create Service"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
