"use client";

import { useState } from "react";
import type { Slot, SlotStatus } from "@/types/database";
import { formatSlotRange } from "@/lib/timezone";
import { statusLabel } from "@/lib/slots";
import { cn } from "@/lib/cn";

interface Props {
  slot: Slot;
  disabled?: boolean;
  busy?: boolean;
  /** Past slots need explicit confirmation. */
  isPast?: boolean;
  onChange: (slot: Slot, next: SlotStatus) => void;
}

const btnBase =
  "min-h-11 flex-1 rounded-xl px-3 py-2.5 text-xs font-black tracking-wide ring-1 transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-40";

/** One-tap status change. Past slots ask for confirmation first. */
export function AdminSlotRow({ slot, disabled, busy, isPast, onChange }: Props) {
  const [confirming, setConfirming] = useState<SlotStatus | null>(null);

  const request = (next: SlotStatus) => {
    if (next === slot.status) return;
    if (isPast && confirming !== next) {
      setConfirming(next);
      return;
    }
    setConfirming(null);
    onChange(slot, next);
  };

  return (
    <li
      data-testid={`admin-slot-${slot.id}`}
      className="tt-glass rounded-3xl p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-[#f4efe3]">
          {formatSlotRange(slot.start_time, slot.end_time)}
        </p>
        <span className="font-mono text-[10px] font-bold tracking-widest text-white/50">
          {statusLabel(slot.status).toUpperCase()}
          {isPast ? " · PAST" : ""}
        </span>
      </div>
      {confirming && (
        <p role="alert" className="mt-2 rounded-xl bg-amber-300/10 p-2 text-xs text-amber-200 ring-1 ring-amber-300/30">
          This slot is in the past. Tap {statusLabel(confirming)} again to
          confirm.
        </p>
      )}
      <div className="mt-2 flex gap-1.5" role="group" aria-label={`Change status for ${formatSlotRange(slot.start_time, slot.end_time)}`}>
        {(
          [
            { s: "free" as SlotStatus, cls: "bg-lime-300/15 text-lime-200 ring-lime-300/30 hover:bg-lime-300/25" },
            { s: "booked" as SlotStatus, cls: "bg-rose-400/15 text-rose-200 ring-rose-400/30 hover:bg-rose-400/25" },
            { s: "maintenance" as SlotStatus, cls: "bg-amber-300/15 text-amber-200 ring-amber-300/30 hover:bg-amber-300/25" },
          ]
        ).map(({ s, cls }) => (
          <button
            key={s}
            disabled={disabled || busy}
            aria-pressed={slot.status === s}
            onClick={() => request(s)}
            className={cn(
              btnBase,
              cls,
              slot.status === s && "outline-2 outline-offset-1 outline",
            )}
          >
            {s === slot.status ? `● ${statusLabel(s)}` : statusLabel(s)}
          </button>
        ))}
      </div>
    </li>
  );
}
