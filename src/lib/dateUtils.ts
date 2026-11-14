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

