import { format } from "date-fns";

export interface CalendarEventDetails {
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  businessName?: string;
}

/**
 * Format a Date to UTC string for iCalendar (YYYYMMDDTHHmmssZ)
 */
function formatUtcIcsDate(date: Date): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}${d.getUTCDate().toString().padStart(2, "0")}T${d
    .getUTCHours()
    .toString()
    .padStart(2, "0")}${d.getUTCMinutes().toString().padStart(2, "0")}${d
    .getUTCSeconds()
    .toString()
    .padStart(2, "0")}Z`;
}

/**
 * Generates an RFC 5545 iCalendar (.ics) format file string
 */
export function generateIcsFileContent(event: CalendarEventDetails): string {
  const startStr = formatUtcIcsDate(event.startsAt);
  const endStr = formatUtcIcsDate(event.endsAt);
  const nowStr = formatUtcIcsDate(new Date());
  const uid = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@bookingboard.com`;

  const cleanTitle = (event.title || "Appointment").replace(/\n/g, " ");
  const cleanDescription = (event.description || "").replace(/\n/g, "\\n");
  const cleanLocation = (event.location || event.businessName || "").replace(/\n/g, " ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BookingBoard//Appointment Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Upcoming appointment in 2 hours",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Generates a direct "Add to Google Calendar" URL
 */
export function generateGoogleCalendarUrl(event: CalendarEventDetails): string {
  const startStr = formatUtcIcsDate(event.startsAt);
  const endStr = formatUtcIcsDate(event.endsAt);
  const dates = `${startStr}/${endStr}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Appointment",
    dates: dates,
    details: event.description || "",
    location: event.location || event.businessName || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Client-side helper to trigger browser download of the ICS file
 */
export function downloadIcsFile(filename: string, content: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
