import type { Slot } from "@/types/database";
import { formatSlotRange } from "@/lib/timezone";
import { statusLabel } from "@/lib/slots";
import { cn } from "@/lib/cn";
import { ChevronUpIcon, ClockIcon } from "@/components/icons";

const ring: Record<Slot["status"], string> = {
  free: "ring-lime-300/30",
  booked: "ring-rose-400/25",
  maintenance: "ring-amber-300/25",
};

const pill: Record<Slot["status"], string> = {
  free: "bg-lime-300 text-lime-950",
  booked: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/40",
  maintenance: "bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40",
};

export function SlotCard({ slot }: { slot: Slot }) {
  const generated = slot.id.startsWith("generated-");
  const selectable = slot.status === "free";
  return (
    <div
      data-testid={`slot-card-${slot.status}`}
      data-status={slot.status}
      className={cn(
        "tt-glass flex items-center justify-between gap-3 rounded-3xl p-4",
        ring[slot.status],
        !selectable && "opacity-90",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1",
            slot.status === "free"
              ? "bg-lime-300/10 text-lime-200 ring-lime-300/30"
              : slot.status === "booked"
                ? "bg-rose-400/10 text-rose-200 ring-rose-400/30"
                : "bg-amber-300/10 text-amber-200 ring-amber-300/30",
          )}
        >
          <ClockIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black text-[#f4efe3]">
            {formatSlotRange(slot.start_time, slot.end_time)}
          </p>
          {!generated && (
            <p className="mt-0.5 truncate font-mono text-[10px] tracking-wider text-white/40">
              UPDATED {new Date(slot.updated_at).toLocaleString("en-IN")}
            </p>
          )}
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-3 py-1.5 font-mono text-[11px] font-black tracking-widest",
            pill[slot.status],
          )}
        >
          {statusLabel(slot.status)}
        </span>
        {selectable && (
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/50 ring-1 ring-white/10">
            <ChevronUpIcon className="h-4 w-4 rotate-90" />
          </span>
        )}
      </span>
    </div>
  );
}
