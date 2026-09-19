import type { Slot } from "@/types/database";
import { formatSlotRange } from "@/lib/timezone";
import { statusLabel } from "@/lib/slots";
import { cn } from "@/lib/cn";

const cardStyles: Record<Slot["status"], string> = {
  free: "bg-emerald-500/10 ring-emerald-500/40",
  booked: "bg-red-500/10 ring-red-500/40",
  maintenance: "bg-amber-500/10 ring-amber-500/40",
};

const badgeStyles: Record<Slot["status"], string> = {
  free: "bg-emerald-500 text-zinc-950",
  booked: "bg-red-500 text-white",
  maintenance: "bg-amber-400 text-zinc-950",
};

export function SlotCard({ slot }: { slot: Slot }) {
  const generated = slot.id.startsWith("generated-");
  return (
    <div
      data-testid={`slot-card-${slot.status}`}
      data-status={slot.status}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl p-4 ring-1",
        cardStyles[slot.status],
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-bold text-white">
          {formatSlotRange(slot.start_time, slot.end_time)}
        </p>
        {!generated && (
          <p className="mt-0.5 text-xs text-zinc-400">
            Updated {new Date(slot.updated_at).toLocaleString("en-IN")}
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-black tracking-wide",
          badgeStyles[slot.status],
        )}
      >
        {statusLabel(slot.status)}
      </span>
    </div>
  );
}
