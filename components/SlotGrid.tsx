import type { Slot } from "@/types/database";
import { SlotCard } from "@/components/SlotCard";

interface Props {
  slots: Slot[];
  emptyMessage?: string;
}

/** Chronological schedule; colors carry meaning + text labels for a11y. */
export function SlotGrid({
  slots,
  emptyMessage = "No slots for this date yet.",
}: Props) {
  if (slots.length === 0) {
    return (
      <p role="status" className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul aria-label="Daily slots" className="flex flex-col gap-2">
      {slots.map((s) => (
        <li key={s.id}>
          <SlotCard slot={s} />
        </li>
      ))}
    </ul>
  );
}
