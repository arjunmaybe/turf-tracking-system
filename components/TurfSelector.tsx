import type { Turf } from "@/types/database";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/icons";

interface Props {
  turfs: Turf[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Segmented turf switcher shared by public + admin. Independent schedule per turf. */
export function TurfSelector({ turfs, selectedId, onSelect }: Props) {
  if (turfs.length === 0) return null;
  return (
    <div
      role="tablist"
      aria-label="Select turf"
      className="tt-glass grid grid-cols-2 gap-1.5 rounded-3xl p-1.5"
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
              "min-h-11 rounded-2xl px-3 py-2 text-left transition active:scale-[0.99]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300",
              active
                ? "bg-lime-300 text-lime-950 shadow-[0_8px_28px_rgba(163,230,53,0.25)]"
                : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-black">{t.name}</span>
              {active && (
                <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-lime-950/15">
                  <CheckIcon className="h-2.5 w-2.5" />
                </span>
              )}
            </span>
            <span
              className={cn(
                "mt-0.5 block font-mono text-[10px] tracking-[0.18em]",
                active ? "text-lime-950/70" : "text-white/40",
              )}
            >
              60-MIN · IST
            </span>
          </button>
        );
      })}
    </div>
  );
}
