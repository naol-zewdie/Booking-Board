import db from "@/lib/db";
import { generateAppointmentToken } from "@/lib/auth/tokens";
import { dispatchReminderNotification } from "@/lib/notifications/service";

export interface ScheduledReminderJob {
  id: string;
  jobKey: string; // e.g. "reminder:24h:cmtg..."
  appointmentId: string;
  businessId: string;
  reminderType: "24h" | "2h";
  scheduledFor: Date;
  status: "PENDING" | "PROCESSED" | "CANCELLED" | "SKIPPED";
}

// In-memory queue storage for development & testing
const reminderJobQueue: Map<string, ScheduledReminderJob> = new Map();

/**
 * Enqueues 24-hour and 2-hour scheduled reminder jobs for an appointment.
 * Automatically skips negative delays (e.g. same-day or short-notice bookings).
 */
export async function enqueueAppointmentReminders(params: {
  appointmentId: string;
  businessId: string;
  startsAt: Date;
}) {
  const nowMs = Date.now();
  const startsAtMs = params.startsAt.getTime();

  // 1. Calculate 24-Hour Reminder
  const time24hMs = startsAtMs - 24 * 60 * 60 * 1000;
  const delay24hMs = time24hMs - nowMs;

  if (delay24hMs > 0) {
    const jobKey = `reminder:24h:${params.appointmentId}`;
    reminderJobQueue.set(jobKey, {
      id: `job_24h_${params.appointmentId}`,
      jobKey,
      appointmentId: params.appointmentId,
      businessId: params.businessId,
      reminderType: "24h",
      scheduledFor: new Date(time24hMs),
      status: "PENDING",
    });
    console.log(`⏱️ [REMINDER QUEUED: 24h] for Appointment ${params.appointmentId} at ${new Date(time24hMs).toISOString()}`);
  } else {
    console.log(`⏩ [REMINDER SKIPPED: 24h] for Appointment ${params.appointmentId} (booked within 24 hours of start)`);
  }

  // 2. Calculate 2-Hour Reminder
  const time2hMs = startsAtMs - 2 * 60 * 60 * 1000;
  const delay2hMs = time2hMs - nowMs;

  if (delay2hMs > 0) {
    const jobKey = `reminder:2h:${params.appointmentId}`;
    reminderJobQueue.set(jobKey, {
      id: `job_2h_${params.appointmentId}`,
      jobKey,
      appointmentId: params.appointmentId,
      businessId: params.businessId,
      reminderType: "2h",
      scheduledFor: new Date(time2hMs),
      status: "PENDING",
    });
    console.log(`⏱️ [REMINDER QUEUED: 2h] for Appointment ${params.appointmentId} at ${new Date(time2hMs).toISOString()}`);
  } else {
    console.log(`⏩ [REMINDER SKIPPED: 2h] for Appointment ${params.appointmentId} (booked within 2 hours of start)`);
  }
}

/**
 * Layer 1 (Eager Cleanup): Cancels pending reminder jobs when an appointment is cancelled.
 */
export async function cancelAppointmentReminders(appointmentId: string) {
  const jobKey24h = `reminder:24h:${appointmentId}`;
  const jobKey2h = `reminder:2h:${appointmentId}`;

  const job24h = reminderJobQueue.get(jobKey24h);
  if (job24h && job24h.status === "PENDING") {
    job24h.status = "CANCELLED";
    console.log(`🚫 [REMINDER CANCELLED: 24h] for Appointment ${appointmentId}`);
  }

  const job2h = reminderJobQueue.get(jobKey2h);
  if (job2h && job2h.status === "PENDING") {
    job2h.status = "CANCELLED";
    console.log(`🚫 [REMINDER CANCELLED: 2h] for Appointment ${appointmentId}`);
  }
}

/**
 * Layer 2 (Check-at-Send-Time Safeguard):
 * Processes a reminder job, re-verifying from DB that the appointment is still CONFIRMED.
 * If status is CANCELLED, COMPLETED, or NO_SHOW, skips sending with zero side-effects.
 */
export async function processReminderJob(jobKey: string): Promise<{
  processed: boolean;
  dispatched: boolean;
  reason?: string;
}> {
  const job = reminderJobQueue.get(jobKey);
  if (!job) {
    return { processed: false, dispatched: false, reason: "JOB_NOT_FOUND" };
  }

  // 1. Check-at-send-time: Fetch live appointment from DB
  const appointment = await db.appointment.findUnique({
    where: { id: job.appointmentId },
    include: {
      service: true,
      staff: true,
      customer: true,
      business: true,
    },
  });

  if (!appointment) {
    job.status = "SKIPPED";
    return { processed: true, dispatched: false, reason: "APPOINTMENT_DELETED" };
  }

  // 2. State Guard: Only CONFIRMED appointments receive reminders
  if (appointment.status !== "CONFIRMED") {
    job.status = "SKIPPED";
    console.log(
      `🛡️ [SAFEGUARD TRIGGERED: REMINDER ABORTED] Appointment ${appointment.id} is in status '${appointment.status}'. Skipping reminder send.`
    );
    return {
      processed: true,
      dispatched: false,
      reason: `TERMINAL_STATE_${appointment.status}`,
    };
  }

  // 3. Generate token & Dispatch
  const cancellationToken = generateAppointmentToken({
    appointmentId: appointment.id,
    businessId: appointment.businessId,
    startsAt: appointment.startsAt,
  });

  await dispatchReminderNotification(job.reminderType, {
    business: {
      id: appointment.business.id,
      name: appointment.business.name,
      slug: appointment.business.slug,
      timezone: appointment.business.timezone,
      currency: appointment.business.currency,
    },
    appointment: {
      id: appointment.id,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      notes: appointment.notes,
    },
    service: {
      name: appointment.service.name,
      durationMin: appointment.service.durationMin,
      priceCents: appointment.service.priceCents,
    },
    staff: {
      name: appointment.staff.name,
      role: appointment.staff.role,
    },
    customer: {
      name: appointment.customer.name,
      email: appointment.customer.email || "",
      phone: appointment.customer.phone,
    },
    cancellationToken,
  });

  job.status = "PROCESSED";
  return { processed: true, dispatched: true };
}

/**
 * Inspection helper for test assertions
 */
export function getQueuedReminderJobs(appointmentId?: string): ScheduledReminderJob[] {
  const jobs = Array.from(reminderJobQueue.values());
  if (appointmentId) {
    return jobs.filter((j) => j.appointmentId === appointmentId);
  }
  return jobs;
}

export function clearReminderQueue() {
  reminderJobQueue.clear();
}
