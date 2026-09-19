export type SlotStatus = "free" | "booked" | "maintenance";
export type StaffRole = "staff" | "owner";

export interface Turf {
  id: string;
  name: string;
  open_time: string; // "06:00:00"
  close_time: string; // "23:00:00"
  slot_duration_minutes: number;
  phone_number: string | null;
  whatsapp_number: string | null;
  created_at: string;
}

export interface Slot {
  id: string;
  turf_id: string;
  slot_date: string; // "2026-09-15"
  start_time: string; // "19:00:00"
  end_time: string; // "20:00:00"
  status: SlotStatus;
  updated_at: string;
  updated_by: string | null;
}

export interface Staff {
  user_id: string;
  role: StaffRole;
  created_at: string;
}

export interface SlotChange {
  id: string;
  slot_id: string;
  user_id: string | null;
  old_status: SlotStatus | null;
  new_status: SlotStatus | null;
  changed_at: string;
}

export const SLOT_STATUSES: SlotStatus[] = ["free", "booked", "maintenance"];

export function isSlotStatus(value: unknown): value is SlotStatus {
  return (
    value === "free" || value === "booked" || value === "maintenance"
  );
}
