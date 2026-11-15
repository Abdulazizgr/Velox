// East Africa Time (EAT) / Addis Ababa (UTC+3) Date Utilities
// Velox POS runs in Ethiopia where timezone is UTC+3 permanently with no DST.

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Returns the current date in Ethiopian context
 */
export function getEthiopiaNow(): Date {
  return new Date();
}

/**
 * Returns the hour (0-23) in Ethiopia timezone (UTC+3)
 */
export function getEthiopiaHour(date: Date | string | number): number {
  const d = new Date(date);
  return (d.getUTCHours() + 3) % 24;
}

/**
 * Returns UTC start and end Date objects corresponding to 00:00:00.000 and 23:59:59.999 in Addis Ababa
 */
export function getEthiopiaDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const eatDate = new Date(date.getTime() + EAT_OFFSET_MS);
  const year = eatDate.getUTCFullYear();
  const month = eatDate.getUTCMonth();
  const day = eatDate.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - EAT_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - EAT_OFFSET_MS);
  return { start, end };
}

/**
 * Returns UTC start and end Date objects for N days ago in Addis Ababa
 */
export function getEthiopiaPastDaysBounds(daysAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return getEthiopiaDayBounds(targetDate);
}

/**
 * Formats an hour number (0-23) into 12-hour format with AM/PM (e.g., 10 -> "10:00 AM", 14 -> "2:00 PM")
 */
export function formatEthiopiaHour(hour: number): { label12: string; period: "AM" | "PM" } {
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return {
    label12: `${hour12}:00 ${period}`,
    period,
  };
}

/**
 * Parses a time string (e.g., "13:05", "1:05 PM", "09:30") or ISO string strictly in Addis Ababa timezone (UTC+3)
 * and returns the exact corresponding UTC Date object.
 */
export function parseEthiopiaTimeString(timeStr: string | null | undefined, baseDate: Date = new Date()): Date | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  // Find year, month, day in Addis Ababa (UTC+3)
  const eatNow = new Date(baseDate.getTime() + EAT_OFFSET_MS);
  const y = eatNow.getUTCFullYear();
  const m = eatNow.getUTCMonth();
  const d = eatNow.getUTCDate();

  const utcMs = Date.UTC(y, m, d, hours, minutes, 0, 0) - EAT_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Formats a Date into 24-hour "HH:MM" string in Addis Ababa timezone (e.g. for <input type="time"> value)
 */
export function formatEthiopiaTime24(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Formats a 24h time string like "13:05" into a 12-hour string with AM/PM like "1:05 PM"
 */
export function formatTimeString12(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const d = parseEthiopiaTimeString(timeStr);
  if (!d) return timeStr;
  return d.toLocaleTimeString("en-US", {
    timeZone: "Africa/Addis_Ababa",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

