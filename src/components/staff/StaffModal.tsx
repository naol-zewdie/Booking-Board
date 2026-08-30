"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Briefcase, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export interface StaffData {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  active: boolean;
}

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (staff: StaffData) => void;
  staffToEdit?: StaffData | null;
  businessId?: string;
}

export function StaffModal({
  isOpen,
  onClose,
  onSaved,
  staffToEdit,
  businessId,
}: StaffModalProps) {
  const isEditing = Boolean(staffToEdit?.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (staffToEdit) {
      setName(staffToEdit.name);
      setEmail(staffToEdit.email || "");
      setPhone(staffToEdit.phone || "");
      setRole(staffToEdit.role || "");
      setActive(staffToEdit.active);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("");
      setActive(true);
    }
    setErrorMsg("");
  }, [staffToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a staff member name.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        role: role.trim() || "Specialist",
        active,
      };

      const url = isEditing
        ? `/api/staff/${staffToEdit!.id}`
        : `/api/staff${businessId ? `?businessId=${businessId}` : ""}`;

      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save staff member");
      }

      onSaved(data.staff);
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
      title={isEditing ? "Edit Team Member" : "Add Team Member"}
      description={
        isEditing
          ? "Update team member details and contact information."
          : "Add a specialist or staff member to assign bookings to."
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div>
          <Label htmlFor="staff-name">Full Name *</Label>
          <Input
            id="staff-name"
            placeholder="e.g. Dr. Maya Lin, Marcus Vance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="h-4 w-4" />}
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="staff-role">Role / Job Title</Label>
          <Input
            id="staff-role"
            placeholder="e.g. Senior Stylist, Physical Therapist, Lead Tutor"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            icon={<Briefcase className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="staff-email">Email Address</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="name@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
            />
          </div>

          <div>
            <Label htmlFor="staff-phone">Phone Number</Label>
            <Input
              id="staff-phone"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Active for Bookings
            </p>
            <p className="text-[10px] text-slate-500">
              When inactive, this specialist cannot receive new customer bookings.
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
            <span>{isEditing ? "Save Member" : "Create Member"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
