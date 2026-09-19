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
  "min-h-11 flex-1 rounded-xl px-3 py-2.5 text-xs font-black tracking-wide ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40";

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
      className="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">
          {formatSlotRange(slot.start_time, slot.end_time)}
        </p>
        <span className="text-xs font-bold text-zinc-400">
          {statusLabel(slot.status)}
          {isPast ? " · past" : ""}
        </span>
      </div>
      {confirming && (
        <p role="alert" className="mt-2 rounded-xl bg-amber-500/15 p-2 text-xs text-amber-200 ring-1 ring-amber-500/40">
          This slot is in the past. Tap {statusLabel(confirming)} again to
          confirm.
        </p>
      )}
      <div className="mt-2 flex gap-1.5" role="group" aria-label={`Change status for ${formatSlotRange(slot.start_time, slot.end_time)}`}>
        {(
          [
            { s: "free" as SlotStatus, cls: "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40 hover:bg-emerald-500/30" },
            { s: "booked" as SlotStatus, cls: "bg-red-500/20 text-red-200 ring-red-500/40 hover:bg-red-500/30" },
            { s: "maintenance" as SlotStatus, cls: "bg-amber-500/20 text-amber-200 ring-amber-500/40 hover:bg-amber-500/30" },
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
