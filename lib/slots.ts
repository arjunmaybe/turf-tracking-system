import type { Slot, SlotStatus, Turf } from "@/types/database";
import {
  BUSINESS_TIMEZONE,
  formatSlotRange,
  formatTimeDisplay,
  getBusinessDateString,
  getBusinessMinutes,
  minutesToTimeString,
  timeToMinutes,
} from "@/lib/timezone";

export type CurrentState = "free" | "booked" | "maintenance" | "closed";

export interface CurrentStatus {
  state: CurrentState;
  /** Active slot, if `now` falls inside one. */
  currentSlot: Slot | null;
  /** End-time label when currently booked, e.g. "8:00 PM". */
  bookedUntil: string | null;
  /** Next free slot today (after now), if any. */
  nextFreeSlot: Slot | null;
}

export interface GeneratedSlotDef {
  start_time: string;
  end_time: string;
}

/**
 * Deterministic daily grid from turf settings.
 * Example: 06:00–23:00 @ 60min -> 06-07, 07-08, …, 22-23.
 * Pure function — DB writes happen only via ensure_daily_slots() RPC.
 */
export function generateSlotsForDate(
  turf: Pick<Turf, "open_time" | "close_time" | "slot_duration_minutes">,
  _slotDate?: string,
): GeneratedSlotDef[] {
  void _slotDate;
  const dur = turf.slot_duration_minutes;
  if (!Number.isInteger(dur) || dur <= 0 || dur > 480) {
    throw new Error("Invalid slot_duration_minutes");
  }
  const open = timeToMinutes(turf.open_time);
  const close = timeToMinutes(turf.close_time);
  if (!(open < close)) {
    throw new Error("open_time must be before close_time");
  }
  const out: GeneratedSlotDef[] = [];
  for (let s = open; s + dur <= close; s += dur) {
    out.push({
      start_time: minutesToTimeString(s),
      end_time: minutesToTimeString(s + dur),
    });
  }
  return out;
}

export function sortSlots(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) => {
    if (a.slot_date !== b.slot_date) return a.slot_date < b.slot_date ? -1 : 1;
    return a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : 0;
  });
}

/**
 * Current-status calculation.
 * IMPORTANT: compares business-time (Asia/Kolkata) now against
 * slot_date + start_time/end_time — never "first booked slot".
 */
export function getCurrentStatus(
  slots: Slot[],
  at: Date = new Date(),
  timeZone: string = BUSINESS_TIMEZONE,
): CurrentStatus {
  const today = getBusinessDateString(at, timeZone);
  const nowMin = getBusinessMinutes(at, timeZone);
  const todays = sortSlots(slots.filter((s) => s.slot_date === today));

  const current =
    todays.find(
      (s) => timeToMinutes(s.start_time) <= nowMin && nowMin < timeToMinutes(s.end_time),
    ) ?? null;

  if (!current) {
    // Outside all of today's slots: turf is free (nothing active).
    // Callers render "Currently FREE" unless the day has no grid at all.
    const nextFree =
      todays.find(
        (s) => timeToMinutes(s.start_time) > nowMin && s.status === "free",
      ) ?? null;
    const state: CurrentState = todays.length === 0 ? "closed" : "free";
    return { state, currentSlot: null, bookedUntil: null, nextFreeSlot: nextFree };
  }

  if (current.status === "booked") {
    return {
      state: "booked",
      currentSlot: current,
      bookedUntil: formatTimeDisplay(current.end_time),
      nextFreeSlot:
        todays.find(
          (s) =>
            timeToMinutes(s.start_time) >= timeToMinutes(current.end_time) &&
            s.status === "free",
        ) ?? null,
    };
  }
  if (current.status === "maintenance") {
    return {
      state: "maintenance",
      currentSlot: current,
      bookedUntil: null,
      nextFreeSlot:
        todays.find(
          (s) =>
            timeToMinutes(s.start_time) >= timeToMinutes(current.end_time) &&
            s.status === "free",
        ) ?? null,
    };
  }
  return {
    state: "free",
    currentSlot: current,
    bookedUntil: null,
    nextFreeSlot: current,
  };
}

/** Slots idempotently merged: existing rows win; missing defs appended as placeholders. */
export function mergeWithGenerated(
  existing: Slot[],
  defs: GeneratedSlotDef[],
  turfId: string,
  slotDate: string,
): Slot[] {
  const byStart = new Map(existing.map((s) => [s.start_time.slice(0, 5), s]));
  return defs.map((d) => {
    const hit = byStart.get(d.start_time.slice(0, 5));
    if (hit) return hit;
    return {
      id: `generated-${turfId}-${slotDate}-${d.start_time}`,
      turf_id: turfId,
      slot_date: slotDate,
      start_time: d.start_time,
      end_time: d.end_time,
      status: "free" as SlotStatus,
      updated_at: new Date(0).toISOString(),
      updated_by: null,
    };
  });
}

export function statusLabel(status: SlotStatus): string {
  return status === "free" ? "FREE" : status === "booked" ? "BOOKED" : "MAINTENANCE";
}

/** Dynamic WhatsApp message for a specific turf slot (tracking only — manager confirms). */
export function buildWhatsAppMessage(
  turfName: string,
  slotDate: string,
  startTime: string,
  endTime: string,
  dateLabel?: string,
): string {
  const when = dateLabel ?? slotDate;
  return (
    `Hi, I'd like to reserve the ${formatSlotRange(startTime, endTime)} ` +
    `slot at ${turfName} on ${when}. Is it available?`
  );
}

export function buildWhatsAppUrl(whatsappNumber: string | null, message: string): string | null {
  if (!whatsappNumber) return null;
  const digits = whatsappNumber.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildCallUrl(phoneNumber: string | null): string | null {
  if (!phoneNumber) return null;
  const trimmed = phoneNumber.trim();
  if (!trimmed) return null;
  return `tel:${trimmed.replace(/\s/g, "")}`;
}

export function countByStatus(slots: Slot[]): Record<SlotStatus, number> {
  const counts: Record<SlotStatus, number> = { free: 0, booked: 0, maintenance: 0 };
  for (const s of slots) counts[s.status] += 1;
  return counts;
}
