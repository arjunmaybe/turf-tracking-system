import type { CurrentStatus } from "@/lib/slots";
import { cn } from "@/lib/cn";

interface Props {
  status: CurrentStatus | null;
  loading?: boolean;
}

const styles: Record<string, string> = {
  free: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
  booked: "bg-red-500/15 text-red-300 ring-red-500/40",
  maintenance: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  closed: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/40",
};

/** Answers "Is the turf free right now?" from real date/time slot math. */
export function StatusBanner({ status, loading }: Props) {
  if (loading || !status) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800"
      >
        Checking live status…
      </div>
    );
  }
  const dot =
    status.state === "free"
      ? "bg-emerald-400"
      : status.state === "booked"
        ? "bg-red-400"
        : status.state === "maintenance"
          ? "bg-amber-400"
          : "bg-zinc-400";

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
      className={cn("rounded-2xl p-4 ring-1", styles[status.state])}
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={cn("h-3 w-3 rounded-full", dot)} />
        <p className="text-base font-bold">{title}</p>
      </div>
      {status.state === "booked" && status.nextFreeSlot && (
        <p className="mt-1 text-sm opacity-80">
          Next free slot will be shown in the schedule below.
        </p>
      )}
    </div>
  );
}
