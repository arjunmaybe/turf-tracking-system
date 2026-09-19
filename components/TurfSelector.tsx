import type { Turf } from "@/types/database";
import { cn } from "@/lib/cn";

interface Props {
  turfs: Turf[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Turf switcher shared by public + admin. Independent schedule per turf. */
export function TurfSelector({ turfs, selectedId, onSelect }: Props) {
  if (turfs.length === 0) return null;
  return (
    <div
      role="tablist"
      aria-label="Select turf"
      className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-900 p-1.5 ring-1 ring-zinc-800"
    >
      {turfs.map((t) => {
        const active = t.id === selectedId;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.id)}
            className={cn(
              "min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400",
              active
                ? "bg-emerald-500 text-zinc-950"
                : "bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white",
            )}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
