import type { Turf } from "@/types/database";
import { cn } from "@/lib/cn";
import { BallMark } from "@/components/icons";

interface Props {
  turf: Turf | null;
  live?: boolean;
}

/** Sticky glass brand header. No public staff toggle — staff use /login. */
export function TurfHeader({ turf, live = true }: Props) {
  return (
    <header className="sticky top-0 z-40 -mx-4 border-b border-white/10 bg-[#060b16]/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lime-300 text-lime-950 shadow-[0_6px_24px_rgba(163,230,53,0.3)]"
        >
          <BallMark className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tt-display truncate text-lg font-bold leading-tight text-[#f4efe3]">
            TurfTrack
          </p>
          <p className="truncate font-mono text-[10px] tracking-[0.2em] text-white/50">
            CITY ARENA · {turf ? turf.name.toUpperCase() : "LIVE AVAILABILITY"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest ring-1",
            live
              ? "bg-lime-300/10 text-lime-200 ring-lime-300/30"
              : "bg-amber-300/10 text-amber-200 ring-amber-300/30",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              live ? "bg-lime-300 tt-anim-pulse-dot" : "bg-amber-300",
            )}
          />
          {live ? "LIVE" : "OFFLINE"}
        </span>
      </div>
    </header>
  );
}
