import type { CurrentStatus } from "@/lib/slots";
import { formatSlotRange } from "@/lib/timezone";
import { cn } from "@/lib/cn";
import { BoltIcon } from "@/components/icons";

interface Props {
  turfName: string | null;
  status: CurrentStatus | null;
  loading: boolean;
  live: boolean;
}

const pill: Record<string, string> = {
  free: "bg-lime-300 text-lime-950",
  booked: "bg-rose-400 text-rose-950",
  maintenance: "bg-amber-300 text-amber-950",
  closed: "bg-white/15 text-white",
};

function stateLabel(status: CurrentStatus | null): string {
  if (!status) return "CHECKING";
  return status.state.toUpperCase();
}

function nextFreeLabel(status: CurrentStatus | null): string | null {
  if (!status?.nextFreeSlot) return null;
  const s = status.nextFreeSlot;
  return `${formatSlotRange(s.start_time, s.end_time)}`;
}

/** Decorative isometric-style pitch. Purely visual. */
function PitchArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" aria-hidden focusable="false" className={className}>
      <defs>
        <linearGradient id="tt-pitch" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a3e635" stopOpacity="0.28" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 100 75)">
        <rect x="30" y="25" width="140" height="100" rx="10" fill="url(#tt-pitch)" stroke="#bef264" strokeOpacity="0.8" strokeWidth="2" />
        <line x1="100" y1="25" x2="100" y2="125" stroke="#bef264" strokeOpacity="0.7" strokeWidth="1.5" />
        <circle cx="100" cy="75" r="16" stroke="#bef264" strokeOpacity="0.8" strokeWidth="1.5" fill="none" />
        <circle cx="100" cy="75" r="2.4" fill="#bef264" opacity="0.9" />
        <rect x="30" y="55" width="18" height="40" stroke="#bef264" strokeOpacity="0.6" strokeWidth="1.5" fill="none" />
        <rect x="152" y="55" width="18" height="40" stroke="#bef264" strokeOpacity="0.6" strokeWidth="1.5" fill="none" />
        {[45, 65, 85, 105, 125, 145].map((x) => (
          <line key={x} x1={x} y1="25" x2={x} y2="125" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="8" />
        ))}
      </g>
    </svg>
  );
}

/**
 * Premium hero: editorial headline, selected turf, live state and next free
 * slot — all derived from real slot data. No booking language.
 */
export function HeroCard({ turfName, status, loading, live }: Props) {
  const nextFree = nextFreeLabel(status);
  return (
    <section
      aria-label="Availability overview"
      className="tt-glass tt-anim-rise relative overflow-hidden rounded-3xl p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tt-eyebrow text-lime-200/90">City Arena · Real-time tracker</p>
          <h2 className="tt-display mt-2 text-4xl font-bold leading-[1.02] text-[#f4efe3]">
            Check slots.
            <br />
            <span className="italic text-lime-200">Contact manager.</span>
          </h2>
        </div>
        <PitchArt className="tt-anim-float h-24 w-32 shrink-0 opacity-90" />
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest",
            pill[status?.state ?? "closed"],
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-current",
              live && !loading && "tt-anim-pulse-dot",
            )}
          />
          {loading ? "CHECKING" : stateLabel(status)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 font-mono text-[11px] tracking-wider text-white/80 ring-1 ring-white/10">
          <BoltIcon className="h-3.5 w-3.5 text-lime-300" />
          {live ? "LIVE" : "RECONNECTING"}
        </span>
      </div>

      <dl className="relative mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
          <dt className="tt-eyebrow text-white/50">Selected turf</dt>
          <dd className="mt-1 truncate text-sm font-bold text-[#f4efe3]">
            {turfName ?? "—"}
          </dd>
        </div>
        <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
          <dt className="tt-eyebrow text-white/50">Next free slot</dt>
          <dd className="mt-1 truncate text-sm font-bold text-lime-200">
            {loading ? "…" : (nextFree ?? "None today")}
          </dd>
        </div>
      </dl>
    </section>
  );
}
