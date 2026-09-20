"use client";

import { formatDateLabel } from "@/lib/timezone";
import { cn } from "@/lib/cn";

interface Props {
  dates: string[];
  selected: string;
  todayStr: string;
  onSelect: (date: string) => void;
}

function labelFor(date: string, todayStr: string, tomorrowStr: string): string {
  if (date === todayStr) return "Today";
  if (date === tomorrowStr) return "Tomorrow";
  return formatDateLabel(date);
}

function dayParts(date: string): { dow: string; day: string } {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    dow: dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    day: String(d).padStart(2, "0"),
  };
}

/** Today / Tomorrow / upcoming dates as horizontal pills. */
export function DateSelector({ dates, selected, todayStr, onSelect }: Props) {
  const tomorrow = dates[1];
  return (
    <div
      role="tablist"
      aria-label="Select date"
      className="tt-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {dates.map((d) => {
        const active = d === selected;
        const named = d === todayStr || d === tomorrow;
        const { dow, day } = dayParts(d);
        return (
          <button
            key={d}
            role="tab"
            aria-selected={active}
            title={d}
            onClick={() => onSelect(d)}
            className={cn(
              "min-h-11 w-16 shrink-0 rounded-2xl px-2 py-2 text-center ring-1 transition active:scale-[0.97]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300",
              active
                ? "bg-lime-300 text-lime-950 ring-lime-300 shadow-[0_8px_28px_rgba(163,230,53,0.25)]"
                : "tt-glass text-white/70 hover:text-white",
            )}
          >
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.18em]">
              {named ? labelFor(d, todayStr, tomorrow) : dow}
            </span>
            <span className="tt-display block text-xl font-bold leading-tight">{day}</span>
            <span className={cn("block truncate text-[10px]", active ? "text-lime-950/70" : "text-white/40")}>
              {named ? formatDateLabel(d) : labelFor(d, todayStr, tomorrow)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
