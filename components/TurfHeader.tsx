import type { Turf } from "@/types/database";

export function TurfHeader({ turf }: { turf: Turf | null }) {
  return (
    <header className="flex items-center gap-3">
      <div
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-zinc-950"
      >
        ⚽
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-white">
          {turf ? turf.name : "Turf Slot Tracking"}
        </h1>
        <p className="text-sm text-zinc-400">Live Slot Availability</p>
      </div>
    </header>
  );
}
