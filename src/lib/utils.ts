import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(priceCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export function formatDuration(durationMin: number): string {
  if (durationMin < 60) {
    return `${durationMin}m`;
  }
  const hours = Math.floor(durationMin / 60);
  const remainingMin = durationMin % 60;
  return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
}

/**
 * Detects application slot collisions, PostgreSQL 23P01 exclusion constraint violations,
 * and Prisma (PrismaClientKnownRequestError / PrismaClientUnknownRequestError) wrapped exclusion errors.
 */
export function isExclusionOrCollisionError(error: any): boolean {
  if (!error) return false;

  // 1. Application-level explicit collision signal
  if (error.message === "SLOT_UNAVAILABLE") return true;

  // 2. Direct database driver error code
  if (error.code === "23P01") return true;

  // 3. Extract all possible error text fragments (message, meta, stack, name)
  const msg = String(error.message || "");
  const metaStr = error.meta ? JSON.stringify(error.meta) : "";
  const fullTrace = `${error.name || ""} ${error.constructor?.name || ""} ${msg} ${metaStr}`.toLowerCase();

  // 4. PostgreSQL 23P01 and GiST Exclusion Constraint Signatures
  const exclusionSignatures = [
    "23p01",
    "no_overlapping_appointments",
    "exclusion constraint",
    "conflicting key value violates exclusion constraint",
    "exclusion_violation",
    "violates exclusion constraint",
  ];

  for (const sig of exclusionSignatures) {
    if (fullTrace.includes(sig)) {
      return true;
    }
  }

  // 5. Prisma Known Request Error with exclusion metadata
  if (error.code === "P2002" || error.code === "P2010" || error.code === "P2034") {
    if (metaStr.includes("no_overlapping_appointments") || metaStr.includes("23p01")) {
      return true;
    }
  }

  return false;
}
