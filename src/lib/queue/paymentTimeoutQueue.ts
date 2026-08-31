import db from "@/lib/db";

export interface ScheduledTimeoutJob {
  id: string;
  jobKey: string; // e.g. "payment_timeout:cmtg..."
  appointmentId: string;
  scheduledFor: Date;
  status: "PENDING" | "PROCESSED" | "CANCELLED" | "SKIPPED";
}

// In-memory queue storage for development & testing
const timeoutJobQueue: Map<string, ScheduledTimeoutJob> = new Map();

/**
 * Enqueues a 15-minute expiration job for an appointment in PENDING_PAYMENT status.
 */
export async function enqueuePaymentTimeout(
  appointmentId: string,
  timeoutMinutes: number = 15
) {
  const jobKey = `payment_timeout:${appointmentId}`;
  const scheduledFor = new Date(Date.now() + timeoutMinutes * 60 * 1000);

  timeoutJobQueue.set(jobKey, {
    id: `job_timeout_${appointmentId}`,
    jobKey,
    appointmentId,
    scheduledFor,
    status: "PENDING",
  });

  console.log(`⏱️ [PAYMENT TIMEOUT QUEUED] 15-minute hold for Appointment ${appointmentId} expires at ${scheduledFor.toISOString()}`);
}

/**
 * Cancels a pending 15-minute payment timeout when payment is successfully captured.
 */
export async function cancelPaymentTimeout(appointmentId: string) {
  const jobKey = `payment_timeout:${appointmentId}`;
  const job = timeoutJobQueue.get(jobKey);
  if (job && job.status === "PENDING") {
    job.status = "CANCELLED";
    console.log(`✅ [PAYMENT TIMEOUT CANCELLED] Appointment ${appointmentId} payment captured`);
  }
}

/**
 * Executes the payment timeout check with an atomic conditional guard.
 * If the appointment has already transitioned to CONFIRMED (via webhook) or CANCELLED, this job safely no-ops.
 */
export async function processPaymentTimeoutJob(jobKey: string): Promise<{
  processed: boolean;
  expired: boolean;
  reason?: string;
}> {
  const job = timeoutJobQueue.get(jobKey);
  if (!job) {
    return { processed: false, expired: false, reason: "JOB_NOT_FOUND" };
  }

  // Atomic Conditional Execution: Check and transition within a single transaction
  const result = await db.$transaction(async (tx: any) => {
    const apt = await tx.appointment.findUnique({
      where: { id: job.appointmentId },
    });

    if (!apt) {
      return { expired: false, reason: "APPOINTMENT_NOT_FOUND" };
    }

    // Winner Guard: If webhook or user already modified the status, abort safely
    if (apt.status !== "PENDING_PAYMENT") {
      console.log(
        `🛡️ [PAYMENT TIMEOUT ABORTED] Appointment ${apt.id} is in status '${apt.status}'. Hold expiration skipped.`
      );
      return { expired: false, reason: `ALREADY_${apt.status}` };
    }

    // Transition abandoned hold to CANCELLED
    const updated = await tx.appointment.update({
      where: { id: job.appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "SYSTEM",
        cancellationReason: "Payment hold timed out after 15 minutes",
      },
    });

    return { expired: true, appointment: updated };
  });

  job.status = result.expired ? "PROCESSED" : "SKIPPED";
  return { processed: true, expired: result.expired, reason: result.reason };
}

export function getQueuedTimeoutJobs() {
  return Array.from(timeoutJobQueue.values());
}

export function clearPaymentTimeoutQueue() {
  timeoutJobQueue.clear();
}
