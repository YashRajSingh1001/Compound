// All "days" in the app are plain YYYY-MM-DD strings in the user's timezone.
// Date maths is done in UTC on those strings, so DST and server timezone
// never shift a day.

// Logging at 1 am still counts toward the previous day — the evening
// check-in often runs past midnight.
export const DAY_START_HOUR = 4;

export const TZ_COOKIE = "tz";

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Today's date in `tz`, where the day starts at DAY_START_HOUR. */
export function todayIn(tz: string, now = new Date()): string {
  const shifted = new Date(now.getTime() - DAY_START_HOUR * 3_600_000);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const date = toUTC(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: string): number {
  return (toUTC(iso).getUTCDay() + 6) % 7;
}

export function isWeekend(iso: string): boolean {
  return weekdayIndex(iso) >= 5;
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

/** "Mon 26 Oct" */
export function formatDay(iso: string): string {
  return toUTC(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** 135 → "2 h 15 m", 45 → "45 m" */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} m` : `${h} h`;
}

/** "Thursday" */
export function weekdayName(iso: string): string {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekdayIndex(iso)];
}
