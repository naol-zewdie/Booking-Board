export interface TimezoneOption {
  value: string;
  label: string;
  group: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // North America
  { value: "America/New_York", label: "Eastern Time (US & Canada) - New York", group: "North America" },
  { value: "America/Chicago", label: "Central Time (US & Canada) - Chicago", group: "North America" },
  { value: "America/Denver", label: "Mountain Time (US & Canada) - Denver", group: "North America" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada) - Los Angeles", group: "North America" },
  { value: "America/Anchorage", label: "Alaska Time - Anchorage", group: "North America" },
  { value: "Pacific/Honolulu", label: "Hawaii Time - Honolulu", group: "North America" },
  { value: "America/Toronto", label: "Eastern Time - Toronto", group: "North America" },
  { value: "America/Vancouver", label: "Pacific Time - Vancouver", group: "North America" },

  // Europe
  { value: "Europe/London", label: "GMT / British Summer Time - London", group: "Europe" },
  { value: "Europe/Paris", label: "Central European Time - Paris, Berlin, Rome", group: "Europe" },
  { value: "Europe/Amsterdam", label: "Central European Time - Amsterdam", group: "Europe" },
  { value: "Europe/Athens", label: "Eastern European Time - Athens, Bucharest", group: "Europe" },
  { value: "Europe/Dublin", label: "Irish Standard Time - Dublin", group: "Europe" },

  // Africa
  { value: "Africa/Cairo", label: "Eastern European Time - Cairo", group: "Africa" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time - Johannesburg", group: "Africa" },
  { value: "Africa/Nairobi", label: "East Africa Time - Nairobi", group: "Africa" },
  { value: "Africa/Addis_Ababa", label: "East Africa Time - Addis Ababa", group: "Africa" },
  { value: "Africa/Lagos", label: "West Africa Time - Lagos", group: "Africa" },

  // Asia & Middle East
  { value: "Asia/Dubai", label: "Gulf Standard Time - Dubai", group: "Asia & Middle East" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time - Riyadh", group: "Asia & Middle East" },
  { value: "Asia/Kolkata", label: "India Standard Time - Mumbai, Delhi", group: "Asia & Middle East" },
  { value: "Asia/Singapore", label: "Singapore Standard Time - Singapore", group: "Asia & Middle East" },
  { value: "Asia/Tokyo", label: "Japan Standard Time - Tokyo", group: "Asia & Middle East" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time - Hong Kong", group: "Asia & Middle East" },
  { value: "Asia/Bangkok", label: "Indochina Time - Bangkok", group: "Asia & Middle East" },

  // Australia & Pacific
  { value: "Australia/Sydney", label: "Australian Eastern Time - Sydney, Melbourne", group: "Australia & Pacific" },
  { value: "Australia/Perth", label: "Australian Western Time - Perth", group: "Australia & Pacific" },
  { value: "Pacific/Auckland", label: "New Zealand Time - Auckland", group: "Australia & Pacific" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)", group: "Global" },
];

export const WEEKDAYS = [
  { dayIndex: 0, name: "Sunday", short: "Sun" },
  { dayIndex: 1, name: "Monday", short: "Mon" },
  { dayIndex: 2, name: "Tuesday", short: "Tue" },
  { dayIndex: 3, name: "Wednesday", short: "Wed" },
  { dayIndex: 4, name: "Thursday", short: "Thu" },
  { dayIndex: 5, name: "Friday", short: "Fri" },
  { dayIndex: 6, name: "Saturday", short: "Sat" },
];

/**
 * Converts minutes from midnight (e.g. 540) to "09:00 AM" format
 */
export function minutesToTimeString(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const padMins = mins.toString().padStart(2, "0");
  const padHours = hours12.toString().padStart(2, "0");
  return `${padHours}:${padMins} ${period}`;
}

/**
 * Converts 24h string format (e.g. "09:00" or "17:30") to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hoursStr, minsStr] = timeStr.split(":");
  const hours = parseInt(hoursStr, 10) || 0;
  const mins = parseInt(minsStr, 10) || 0;
  return hours * 60 + mins;
}

/**
 * Converts minutes from midnight to "HH:mm" 24-hour format for <input type="time">
 */
export function minutesTo24hTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
