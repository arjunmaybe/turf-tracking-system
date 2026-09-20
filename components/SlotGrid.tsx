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
      <p role="status" className="tt-glass rounded-3xl p-4 text-sm text-white/60">
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
