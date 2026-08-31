import {
  EmailTemplateParams,
  GeneratedEmailMessage,
  generateBookingConfirmationEmail,
  generate24HourReminderEmail,
  generate2HourReminderEmail,
  generateCancellationEmail,
} from "./email";

export interface DispatchedNotificationRecord {
  id: string;
  type: "BOOKING_CONFIRMATION" | "REMINDER_24H" | "REMINDER_2H" | "CANCELLATION";
  to: string;
  subject: string;
  appointmentId: string;
  businessId: string;
  dispatchedAt: Date;
  hasAttachment: boolean;
}

// In-memory delivery ledger for auditing and test assertions
const notificationLedger: DispatchedNotificationRecord[] = [];

/**
 * Dispatches an email notification. Logs in development and records into delivery ledger.
 */
export async function sendEmail(
  message: GeneratedEmailMessage,
  metadata: {
    type: DispatchedNotificationRecord["type"];
    appointmentId: string;
    businessId: string;
  }
): Promise<{ success: boolean; messageId: string }> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Record into delivery ledger
  notificationLedger.push({
    id: messageId,
    type: metadata.type,
    to: message.to,
    subject: message.subject,
    appointmentId: metadata.appointmentId,
    businessId: metadata.businessId,
    dispatchedAt: new Date(),
    hasAttachment: Boolean(message.icsAttachment),
  });

  console.log(`📨 [NOTIFICATION DISPATCHED: ${metadata.type}] to ${message.to} | Subject: "${message.subject}"`);

  return { success: true, messageId };
}

export async function dispatchBookingConfirmation(params: EmailTemplateParams) {
  if (!params.customer.email) return;
  const message = generateBookingConfirmationEmail(params);
  return sendEmail(message, {
    type: "BOOKING_CONFIRMATION",
    appointmentId: params.appointment.id,
    businessId: params.business.id,
  });
}

export async function dispatchCancellationNotification(params: EmailTemplateParams) {
  if (!params.customer.email) return;
  const message = generateCancellationEmail(params);
  return sendEmail(message, {
    type: "CANCELLATION",
    appointmentId: params.appointment.id,
    businessId: params.business.id,
  });
}

export async function dispatchReminderNotification(
  type: "24h" | "2h",
  params: EmailTemplateParams
) {
  if (!params.customer.email) return;
  const message =
    type === "24h"
      ? generate24HourReminderEmail(params)
      : generate2HourReminderEmail(params);

  return sendEmail(message, {
    type: type === "24h" ? "REMINDER_24H" : "REMINDER_2H",
    appointmentId: params.appointment.id,
    businessId: params.business.id,
  });
}

/**
 * Helper to inspect dispatched notifications during tests
 */
export function getDispatchedNotifications(appointmentId?: string) {
  if (appointmentId) {
    return notificationLedger.filter((n) => n.appointmentId === appointmentId);
  }
  return [...notificationLedger];
}

export function clearDispatchedNotifications() {
  notificationLedger.length = 0;
}
