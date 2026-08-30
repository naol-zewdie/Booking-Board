"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { StaffModal, StaffData } from "./StaffModal";
import { WorkingHoursModal, WorkingHourItem } from "./WorkingHoursModal";
import { minutesToTimeString } from "@/lib/timezones";

export interface StaffItem extends StaffData {
  id: string;
  createdAt: string;
  workingHours: WorkingHourItem[];
  _count?: {
    appointments: number;
  };
}

interface StaffManagerProps {
  initialStaff: StaffItem[];
  businessId: string;
}

export function StaffManager({ initialStaff, businessId }: StaffManagerProps) {
  const [staffList, setStaffList] = useState<StaffItem[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffItem | null>(null);

  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [staffForHours, setStaffForHours] = useState<StaffItem | null>(null);

  // Deactivate safety modal state
  const [deactivateModalData, setDeactivateModalData] = useState<{
    staff: StaffItem;
    appointmentCount: number;
    message: string;
  } | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filter staff
  const filteredStaff = staffList.filter((st) => {
    const matches =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.role && st.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.email && st.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterActive === "active") return matches && st.active;
    if (filterActive === "inactive") return matches && !st.active;
    return matches;
  });

  // Instant Active Toggle with optimistic update
  const handleToggleActive = async (member: StaffItem) => {
    const newActive = !member.active;

    setStaffList((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, active: newActive } : s))
    );

    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, active: member.active } : s))
      );
      alert("Failed to update staff status. Please try again.");
    }
  };

  // Delete handler with 409 check
  const handleDeleteStaff = async (member: StaffItem) => {
    if (!confirm(`Are you sure you want to delete "${member.name}"?`)) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.status === 409) {
        setDeactivateModalData({
          staff: member,
          appointmentCount: data.appointmentCount,
          message: data.error,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete staff member");
      }

      setStaffList((prev) => prev.filter((s) => s.id !== member.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete staff member.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // 1-Click Soft Deactivate
  const handleConfirmDeactivate = async () => {
    if (!deactivateModalData) return;

    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/staff/${deactivateModalData.staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      if (!res.ok) {
        throw new Error("Failed to deactivate staff");
      }

      setStaffList((prev) =>
        prev.map((s) =>
          s.id === deactivateModalData.staff.id ? { ...s, active: false } : s
        )
      );

      setDeactivateModalData(null);
    } catch (err: any) {
      alert(err.message || "Failed to deactivate staff.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSavedStaff = (saved: StaffData) => {
    setStaffList((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      if (exists) {
        return prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s));
      }
      return [
        ...prev,
        {
          id: saved.id || `temp-${Date.now()}`,
          name: saved.name,
          email: saved.email || null,
          phone: saved.phone || null,
          role: saved.role || null,
          avatarUrl: saved.avatarUrl || null,
          active: saved.active,
          createdAt: new Date().toISOString(),
          workingHours: [],
          _count: { appointments: 0 },
        },
      ];
    });
  };

  const handleSavedHours = (updatedHours: WorkingHourItem[]) => {
    if (!staffForHours) return;
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === staffForHours.id ? { ...s, workingHours: updatedHours } : s
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">
            Staff & Availability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your team members and configure their weekly working schedules for bookable slots.
          </p>
        </div>

        <Button
          onClick={() => {
            setStaffToEdit(null);
            setIsStaffModalOpen(true);
          }}
          variant="glow"
          size="md"
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Team Member</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/70 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search staff by name, role, or email..."
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
              {mode} ({staffList.filter((s) => mode === "all" || (mode === "active" ? s.active : !s.active)).length})
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 max-w-md mx-auto p-6">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No team members found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
            {searchQuery
              ? "No team members match your search query."
              : "Add your first team member or specialist to assign appointments."}
          </p>
          <Button
            onClick={() => {
              setStaffToEdit(null);
              setIsStaffModalOpen(true);
            }}
            variant="glow"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Team Member</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((member) => (
            <div
              key={member.id}
              className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between group ${
                member.active
                  ? "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md"
                  : "bg-slate-50/60 dark:bg-slate-950/60 border-slate-200/50 dark:border-slate-800/50 opacity-75"
              }`}
            >
              <div>
                {/* Header Row: Initials & Active Switch */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {member.role || "Specialist"}
                      </p>
                    </div>
                  </div>

                  {/* Instant Active Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer" title="Toggle active status">
                    <input
                      type="checkbox"
                      checked={member.active}
                      onChange={() => handleToggleActive(member)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {member.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </p>
                  )}
                  {member.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{member.phone}</span>
                    </p>
                  )}
                </div>

                {/* Working Hours Chips */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="uppercase tracking-wider">Weekly Shifts:</span>
                    <button
                      onClick={() => {
                        setStaffForHours(member);
                        setIsHoursModalOpen(true);
                      }}
                      className="text-primary-600 dark:text-primary-400 hover:underline font-bold"
                    >
                      Edit Hours →
                    </button>
                  </div>

                  {member.workingHours.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No working hours set</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {member.workingHours.map((wh) => (
                        <span
                          key={wh.id || wh.weekday}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300"
                        >
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][wh.weekday]}:{" "}
                          {minutesToTimeString(wh.startMin)} - {minutesToTimeString(wh.endMin)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  {member._count?.appointments ?? 0} appointment{(member._count?.appointments ?? 0) === 1 ? "" : "s"}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setStaffToEdit(member);
                      setIsStaffModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Member Profile"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteStaff(member)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setStaffToEdit(null);
        }}
        onSaved={handleSavedStaff}
        staffToEdit={staffToEdit}
        businessId={businessId}
      />

      {/* Working Hours Modal */}
      {staffForHours && (
        <WorkingHoursModal
          isOpen={isHoursModalOpen}
          onClose={() => {
            setIsHoursModalOpen(false);
            setStaffForHours(null);
          }}
          staffId={staffForHours.id}
          staffName={staffForHours.name}
          initialHours={staffForHours.workingHours}
          onSaved={handleSavedHours}
        />
      )}

      {/* Deactivate Safety Modal */}
      {deactivateModalData && (
        <Modal
          isOpen={true}
          onClose={() => setDeactivateModalData(null)}
          title="Cannot Delete Staff with History"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>&quot;{deactivateModalData.staff.name}&quot;</strong> is linked to{" "}
                <strong>{deactivateModalData.appointmentCount}</strong> appointment(s) in your records.
                <p className="mt-1">
                  Hard-deleting this team member would break appointment history. You can <strong>deactivate</strong> them instead to remove them from future slot generation without losing customer history.
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
                <span>Deactivate Specialist</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
