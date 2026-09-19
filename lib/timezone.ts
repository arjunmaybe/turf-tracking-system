/**
 * Single source of truth for business time.
 * The facility operates in Asia/Kolkata. All "current slot" calculations
 * must use this timezone — never the browser/server local time directly.
 */

export const BUSINESS_TIMEZONE =
  process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE || "Asia/Kolkata";

/** "HH:MM[:SS]" -> minutes since midnight. */
export function timeToMinutes(t: string): number {
  const parts = t.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/** Minutes since midnight -> "HH:MM:SS" (DB time format). */
export function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function partsInTimezone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** "YYYY-MM-DD" for the given instant in the business timezone. */
export function getBusinessDateString(
  at: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  const p = partsInTimezone(at, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes since midnight for the given instant in the business timezone. */
export function getBusinessMinutes(
  at: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE,
): number {
  const p = partsInTimezone(at, timeZone);
  return Number(p.hour) * 60 + Number(p.minute);
}

/** "YYYY-MM-DD" for business-today + offset days. */
export function getBusinessDatePlus(
  offsetDays: number,
  at: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  // Compute the business-date noon anchor, then shift by whole days.
  const todayStr = getBusinessDateString(at, timeZone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const anchorUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const shifted = new Date(anchorUtc + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/** "19:00:00" -> "7:00 PM" for display. */
export function formatTimeDisplay(t: string): string {
  const [hRaw, mRaw] = t.split(":");
  let h = Number(hRaw);
  const m = mRaw ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return m === "00" ? `${h}:00 ${ampm}` : `${h}:${m} ${ampm}`;
}

/** "19:00:00"-"20:00:00" -> "7:00 PM – 8:00 PM". */
export function formatSlotRange(start: string, end: string): string {
  return `${formatTimeDisplay(start)} – ${formatTimeDisplay(end)}`;
}

/** "2026-09-15" -> "Mon, 15 Sep" (business TZ label, date-only so TZ-safe). */
export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Build a Date representing an IST wall-clock time, for messaging only.
 * (Slot comparisons use minutes; this is for human-readable labels.)
 */
export function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}
