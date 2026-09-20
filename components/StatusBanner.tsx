import type { CurrentStatus } from "@/lib/slots";
import { cn } from "@/lib/cn";

interface Props {
  status: CurrentStatus | null;
  loading?: boolean;
}

const card: Record<string, string> = {
  free: "ring-lime-300/30",
  booked: "ring-rose-400/30",
  maintenance: "ring-amber-300/30",
  closed: "ring-white/10",
};

const glow: Record<string, string> = {
  free: "bg-lime-300/15",
  booked: "bg-rose-400/15",
  maintenance: "bg-amber-300/15",
  closed: "bg-white/5",
};

const dot: Record<string, string> = {
  free: "bg-lime-300 tt-anim-pulse-dot",
  booked: "bg-rose-400",
  maintenance: "bg-amber-300",
  closed: "bg-white/40",
};

/** Answers "Is the turf free right now?" from real date/time slot math. */
export function StatusBanner({ status, loading }: Props) {
  if (loading || !status) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="tt-glass rounded-3xl p-4 text-sm text-white/60"
      >
        Checking live status…
      </div>
    );
  }

  const title =
    status.state === "free"
      ? "Turf is Currently FREE"
      : status.state === "booked"
        ? `Turf is Currently BOOKED${status.bookedUntil ? ` — Until ${status.bookedUntil}` : ""}`
        : status.state === "maintenance"
          ? "Turf is Under MAINTENANCE"
          : "No Schedule Available";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("tt-glass relative overflow-hidden rounded-3xl p-4", card[status.state])}
    >
      <div aria-hidden className={cn("pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl", glow[status.state])} />
      <div className="relative flex items-center gap-2.5">
        <span aria-hidden className={cn("h-3 w-3 shrink-0 rounded-full", dot[status.state])} />
        <p className="tt-display text-lg font-bold leading-snug text-[#f4efe3]">{title}</p>
      </div>
      {status.state === "booked" && status.nextFreeSlot && (
        <p className="relative mt-1 text-sm text-white/60">
          Next free slot will be shown in the schedule below.
        </p>
      )}
    </div>
  );
}
