export type AppointmentStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  NO_SHOW: [],   // Terminal
};

/**
 * Checks if a status transition is valid according to the Appointment state machine.
 * 
 * NOTE: `currentStatus === nextStatus` returns `true` deliberately to support:
 * 1. Idempotent retries from clients/network.
 * 2. Updating metadata (e.g., internal staff notes or paymentStatus) on existing 
 *    terminal appointments (such as COMPLETED or CANCELLED) without mutating status.
 */
export function canTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus as AppointmentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus as AppointmentStatus);
}

/**
 * Returns list of allowed next statuses for a given current status.
 */
export function getAllowedTransitions(currentStatus: string): AppointmentStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus as AppointmentStatus] || [];
}
