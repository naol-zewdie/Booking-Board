import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { format, addMinutes, isBefore } from "date-fns";

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface WorkingHourItem {
  weekday: number;
  startMin: number;
  endMin: number;
}

export interface TimeOffItem {
  startsAt: Date;
  endsAt: Date;
}

export interface AppointmentSlotItem {
  startsAt: Date;
  endsAt: Date;
  bufferMin?: number;
}

export interface GenerateSlotsParams {
  workingHours: WorkingHourItem[];
  timeOff: TimeOffItem[];
  existingAppointments: AppointmentSlotItem[];
  service: { durationMin: number; bufferMin: number };
  dateStr: string; // "YYYY-MM-DD"
  businessTz: string;
  slotGranularityMin?: number; // e.g. 15 or service.durationMin
  minNoticeMin?: number; // e.g. 120 min
  now?: Date; // injected for testing
  staffId?: string;
  staffName?: string;
}

export interface BookableSlot {
  startsAt: Date;
  endsAt: Date;
  formattedTime: string; // e.g. "09:00 AM" in business timezone
  formattedDate: string; // e.g. "2026-09-01" in business timezone
  staffId?: string;
  staffName?: string;
}

/**
 * Subtracts a list of blocked intervals from a list of available intervals.
 */
export function subtractIntervals(
  availableWindows: TimeInterval[],
  blockedWindows: TimeInterval[]
): TimeInterval[] {
  let result = [...availableWindows];

  for (const blocked of blockedWindows) {
    const nextResult: TimeInterval[] = [];

    for (const window of result) {
      // 1. Blocked is completely before or after window -> window stays intact
      if (blocked.end.getTime() <= window.start.getTime() || blocked.start.getTime() >= window.end.getTime()) {
        nextResult.push(window);
        continue;
      }

      // 2. Blocked overlaps the start of window
      if (blocked.start.getTime() <= window.start.getTime() && blocked.end.getTime() < window.end.getTime()) {
        nextResult.push({
          start: new Date(blocked.end.getTime()),
          end: new Date(window.end.getTime()),
        });
        continue;
      }

      // 3. Blocked overlaps the end of window
      if (blocked.start.getTime() > window.start.getTime() && blocked.end.getTime() >= window.end.getTime()) {
        nextResult.push({
          start: new Date(window.start.getTime()),
          end: new Date(blocked.start.getTime()),
        });
        continue;
      }

      // 4. Blocked is inside window (splits window into two)
      if (blocked.start.getTime() > window.start.getTime() && blocked.end.getTime() < window.end.getTime()) {
        nextResult.push({
          start: new Date(window.start.getTime()),
          end: new Date(blocked.start.getTime()),
        });
        nextResult.push({
          start: new Date(blocked.end.getTime()),
          end: new Date(window.end.getTime()),
        });
        continue;
      }

      // 5. Blocked completely engulfs window -> window is eliminated
    }

    result = nextResult;
  }

  return result;
}

/**
 * Core Slot Generation Algorithm
 * Pure function: Deterministic, no DB calls, fully testable.
 */
export function generateSlots(params: GenerateSlotsParams): BookableSlot[] {
  const {
    workingHours,
    timeOff,
    existingAppointments,
    service,
    dateStr,
    businessTz,
    slotGranularityMin = 15,
    minNoticeMin = 120,
    now = new Date(),
    staffId,
    staffName,
  } = params;

  // 1. Parse dateStr in business timezone to determine target weekday
  // Parse "YYYY-MM-DD" at midnight in business timezone
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // Reference date in business timezone
  const localMidnightDate = new Date(year, month, day, 0, 0, 0, 0);
  // Get weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const targetWeekday = localMidnightDate.getDay();

  // Find working hours for this weekday
  const matchingHours = workingHours.filter((wh) => wh.weekday === targetWeekday);
  if (matchingHours.length === 0) {
    return []; // Closed / day off
  }

  // 2. Convert working hours into UTC start and end instants using businessTz
  const baseWindows: TimeInterval[] = matchingHours.map((wh) => {
    const startHours = Math.floor(wh.startMin / 60);
    const startMins = wh.startMin % 60;
    const endHours = Math.floor(wh.endMin / 60);
    const endMins = wh.endMin % 60;

    // Create wall-clock string representation "YYYY-MM-DD HH:mm:00"
    const startIsoLocal = `${dateStr} ${startHours.toString().padStart(2, "0")}:${startMins.toString().padStart(2, "0")}:00`;
    const endIsoLocal = `${dateStr} ${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}:00`;

    // fromZonedTime accurately translates wall-clock in businessTz to UTC Date instant
    const startUtc = fromZonedTime(startIsoLocal, businessTz);
    const endUtc = fromZonedTime(endIsoLocal, businessTz);

    return { start: startUtc, end: endUtc };
  });

  // 3. Prepare Time-off blocked windows
  const timeOffWindows: TimeInterval[] = timeOff.map((to) => ({
    start: new Date(to.startsAt),
    end: new Date(to.endsAt),
  }));

  // 4. Prepare Existing Appointments blocked windows (padded with their own buffer times)
  const appointmentWindows: TimeInterval[] = existingAppointments.map((apt) => {
    const buffer = apt.bufferMin || 0;
    const aptStart = new Date(apt.startsAt);
    const aptEndWithBuffer = addMinutes(new Date(apt.endsAt), buffer);
    return {
      start: aptStart,
      end: aptEndWithBuffer,
    };
  });

  // 5. Subtract Time-Off and Appointments to find free bookable windows
  const afterTimeOff = subtractIntervals(baseWindows, timeOffWindows);
  const freeWindows = subtractIntervals(afterTimeOff, appointmentWindows);

  // 6. Walk free windows in slotGranularityMin increments
  const bookableSlots: BookableSlot[] = [];
  const minNoticeTime = addMinutes(now, minNoticeMin);

  for (const window of freeWindows) {
    let currentSlotStart = new Date(window.start.getTime());

    while (true) {
      // Calculate appointment end time (service duration)
      const currentSlotEnd = addMinutes(currentSlotStart, service.durationMin);
      // Also calculate total required slot space including this service's own cleanup buffer
      const currentSlotTotalRequiredEnd = addMinutes(currentSlotEnd, service.bufferMin);

      // Check if service duration + its own cleanup buffer fits inside the free window
      if (currentSlotTotalRequiredEnd.getTime() > window.end.getTime()) {
        break; // Doesn't fit in remaining window
      }

      // Check minimum notice filter (must not start before now + minNoticeMin)
      if (currentSlotStart.getTime() >= minNoticeTime.getTime()) {
        const formattedTime = formatInTimeZone(currentSlotStart, businessTz, "hh:mm a");
        const formattedDate = formatInTimeZone(currentSlotStart, businessTz, "yyyy-MM-dd");

        bookableSlots.push({
          startsAt: new Date(currentSlotStart),
          endsAt: new Date(currentSlotEnd),
          formattedTime,
          formattedDate,
          staffId,
          staffName,
        });
      }

      // Step forward by slotGranularityMin
      currentSlotStart = addMinutes(currentSlotStart, slotGranularityMin);
    }
  }

  return bookableSlots;
}
