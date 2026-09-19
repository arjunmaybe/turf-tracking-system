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

/** Today / Tomorrow / upcoming dates. */
export function DateSelector({ dates, selected, todayStr, onSelect }: Props) {
  const tomorrow = dates[1];
  return (
    <div
      role="tablist"
      aria-label="Select date"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {dates.map((d) => {
        const active = d === selected;
        return (
          <button
            key={d}
            role="tab"
            aria-selected={active}
            title={d}
            onClick={() => onSelect(d)}
            className={cn(
              "min-h-11 shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400",
              active
                ? "bg-white text-zinc-950 ring-white"
                : "bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800 hover:text-white",
            )}
          >
            <span className="block leading-tight">
              {labelFor(d, todayStr, tomorrow)}
            </span>
            <span
              className={cn(
                "block text-[11px] font-medium leading-tight",
                active ? "text-zinc-600" : "text-zinc-500",
              )}
            >
              {formatDateLabel(d)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
