import { formatPrice, formatDuration } from "@/lib/utils";
import { generateIcsFileContent, generateGoogleCalendarUrl } from "@/lib/calendar/ics";

export interface EmailTemplateParams {
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    address?: string | null;
    phone?: string | null;
  };
  appointment: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    notes?: string | null;
  };
  service: {
    name: string;
    durationMin: number;
    priceCents: number;
    bufferMin?: number;
    color?: string | null;
  };
  staff: {
    name: string;
    role?: string | null;
  };
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  cancellationToken: string;
  baseUrl?: string;
}

export interface GeneratedEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  icsAttachment?: {
    filename: string;
    content: string;
    contentType: string;
  };
}

/**
 * Generates the HTML and Text email message for an instant Booking Confirmation.
 */
export function generateBookingConfirmationEmail(
  params: EmailTemplateParams
): GeneratedEmailMessage {
  const domain = params.baseUrl || "http://localhost:3000";
  const cancelUrl = `${domain}/b/${params.business.slug}/cancel?token=${params.cancellationToken}`;

  const formattedDate = params.appointment.startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: params.business.timezone,
  });

  const formattedStartTime = params.appointment.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: params.business.timezone,
  });

  const formattedEndTime = params.appointment.endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: params.business.timezone,
  });

  const icsContent = generateIcsFileContent({
    title: `${params.service.name} - ${params.business.name}`,
    businessName: params.business.name,
    startsAt: params.appointment.startsAt,
    endsAt: params.appointment.endsAt,
    location: params.business.address || `${params.business.name} Studio`,
    description: `Booking #${params.appointment.id} with ${params.staff.name}. Need to cancel or reschedule? Visit: ${cancelUrl}`,
  });

  const googleCalUrl = generateGoogleCalendarUrl({
    title: `${params.service.name} - ${params.business.name}`,
    businessName: params.business.name,
    startsAt: params.appointment.startsAt,
    endsAt: params.appointment.endsAt,
    location: params.business.address || `${params.business.name} Studio`,
    description: `Appointment with ${params.staff.name}. Booking ID: ${params.appointment.id}`,
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed - ${params.business.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 24px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; border-radius: 9999px; }
    .title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 12px 0 4px; }
    .subtitle { font-size: 14px; color: #94a3b8; margin: 0; }
    .details-card { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #94a3b8; }
    .val { color: #ffffff; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 12px; text-align: center; margin-right: 8px; margin-bottom: 8px; }
    .btn-secondary { background: #334155; color: #f8fafc; }
    .footer { text-align: center; border-top: 1px solid #334155; padding-top: 20px; margin-top: 24px; font-size: 11px; color: #64748b; }
    .cancel-link { color: #f43f5e; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Booking Confirmed</span>
      <h1 class="title">${params.business.name}</h1>
      <p class="subtitle">Hi ${params.customer.name}, your appointment has been confirmed!</p>
    </div>

    <div class="details-card">
      <div class="row">
        <span class="label">Service</span>
        <span class="val">${params.service.name} (${formatDuration(params.service.durationMin)})</span>
      </div>
      <div class="row">
        <span class="label">Specialist</span>
        <span class="val">${params.staff.name}</span>
      </div>
      <div class="row">
        <span class="label">Date</span>
        <span class="val">${formattedDate}</span>
      </div>
      <div class="row">
        <span class="label">Time</span>
        <span class="val">${formattedStartTime} - ${formattedEndTime} (${params.business.timezone})</span>
      </div>
      <div class="row">
        <span class="label">Total Price</span>
        <span class="val" style="color: #34d399;">${formatPrice(params.service.priceCents, params.business.currency)}</span>
      </div>
      <div class="row">
        <span class="label">Confirmation #</span>
        <span class="val" style="font-family: monospace;">#${params.appointment.id.slice(-8).toUpperCase()}</span>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${googleCalUrl}" target="_blank" class="btn">Add to Google Calendar</a>
    </div>

    <div class="footer">
      <p>Need to reschedule or cancel? You can manage your appointment online up to 2 hours before your start time.</p>
      <p><a href="${cancelUrl}" class="cancel-link">Manage or Cancel Booking</a></p>
      <p style="margin-top: 16px;">${params.business.name} • All times shown in ${params.business.timezone}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Booking Confirmed - ${params.business.name}
--------------------------------------------------
Hi ${params.customer.name}, your appointment has been confirmed!

Service: ${params.service.name} (${formatDuration(params.service.durationMin)})
Specialist: ${params.staff.name}
Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime} (${params.business.timezone})
Price: ${formatPrice(params.service.priceCents, params.business.currency)}
Confirmation #: #${params.appointment.id.slice(-8).toUpperCase()}

Manage or Cancel your appointment:
${cancelUrl}

Add to Google Calendar:
${googleCalUrl}
  `.trim();

  return {
    to: params.customer.email,
    subject: `Booking Confirmed: ${params.service.name} at ${params.business.name}`,
    html,
    text,
    icsAttachment: {
      filename: `booking-${params.appointment.id}.ics`,
      content: icsContent,
      contentType: "text/calendar; charset=utf-8; method=REQUEST",
    },
  };
}

/**
 * Generates the 24-Hour Reminder Email message.
 */
export function generate24HourReminderEmail(
  params: EmailTemplateParams
): GeneratedEmailMessage {
  const domain = params.baseUrl || "http://localhost:3000";
  const cancelUrl = `${domain}/b/${params.business.slug}/cancel?token=${params.cancellationToken}`;

  const formattedStartTime = params.appointment.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: params.business.timezone,
  });

  const subject = `Reminder: Your appointment tomorrow at ${params.business.name}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; background: #1e293b; color: #fff; padding: 32px; border-radius: 24px;">
      <h2 style="color: #3b82f6; margin-top: 0;">See you tomorrow, ${params.customer.name}!</h2>
      <p style="color: #cbd5e1;">This is a friendly 24-hour reminder for your upcoming <strong>${params.service.name}</strong> appointment with <strong>${params.staff.name}</strong>.</p>
      <div style="background: #0f172a; padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Time:</strong> Tomorrow at ${formattedStartTime} (${params.business.timezone})</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> ${params.business.address || params.business.name}</p>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Need to adjust? <a href="${cancelUrl}" style="color: #f43f5e;">Manage / Cancel Online</a></p>
    </div>
  `;

  const text = `
Reminder: Your appointment tomorrow at ${params.business.name}
Hi ${params.customer.name}, your ${params.service.name} appointment with ${params.staff.name} is tomorrow at ${formattedStartTime} (${params.business.timezone}).
Manage/Cancel: ${cancelUrl}
  `.trim();

  return { to: params.customer.email, subject, html, text };
}

/**
 * Generates the 2-Hour Urgent Reminder Email / SMS message.
 */
export function generate2HourReminderEmail(
  params: EmailTemplateParams
): GeneratedEmailMessage {
  const formattedStartTime = params.appointment.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: params.business.timezone,
  });

  const subject = `Starting soon: ${params.service.name} at ${params.business.name} in 2 hours`;
  const text = `Hi ${params.customer.name}, your appointment with ${params.staff.name} at ${params.business.name} starts in 2 hours (${formattedStartTime}). See you soon!`;
  const html = `
    <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; background: #1e293b; color: #fff; padding: 32px; border-radius: 24px;">
      <h2 style="color: #fbbf24; margin-top: 0;">Starting in 2 Hours!</h2>
      <p style="color: #cbd5e1;">Hi ${params.customer.name}, ${params.staff.name} is preparing for your <strong>${params.service.name}</strong> appointment at <strong>${formattedStartTime}</strong>.</p>
      <p style="color: #94a3b8; font-size: 12px;">Please arrive 5 minutes early. ${params.business.address || ""}</p>
    </div>
  `;

  return { to: params.customer.email, subject, html, text };
}

/**
 * Generates the Cancellation Confirmation Email message.
 */
export function generateCancellationEmail(
  params: EmailTemplateParams
): GeneratedEmailMessage {
  const subject = `Cancelled: ${params.service.name} at ${params.business.name}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; background: #1e293b; color: #fff; padding: 32px; border-radius: 24px;">
      <h2 style="color: #f43f5e; margin-top: 0;">Appointment Cancelled</h2>
      <p style="color: #cbd5e1;">Hi ${params.customer.name}, your appointment for <strong>${params.service.name}</strong> with <strong>${params.staff.name}</strong> has been cancelled.</p>
      <p style="color: #94a3b8; font-size: 13px;">The reserved slot has been released. If you would like to book a new appointment in the future, please visit our booking page.</p>
    </div>
  `;

  const text = `
Appointment Cancelled - ${params.business.name}
Hi ${params.customer.name}, your appointment for ${params.service.name} with ${params.staff.name} has been cancelled.
  `.trim();

  return { to: params.customer.email, subject, html, text };
}
