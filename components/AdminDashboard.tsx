"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { resolveAuthState } from "@/lib/auth";
import {
  ensureSlots,
  fetchSlots,
  fetchTurfs,
  freeRemainingSlotsToday,
  updateSlotStatus,
} from "@/lib/slotsApi";
import { subscribeToSlots } from "@/lib/realtime";
import { getCurrentStatus, sortSlots } from "@/lib/slots";
import {
  getBusinessMinutes,
  timeToMinutes,
} from "@/lib/timezone";
import type { Slot, SlotStatus, Turf } from "@/types/database";
import { TurfSelector } from "@/components/TurfSelector";
import { StatusBanner } from "@/components/StatusBanner";
import { DateSelector } from "@/components/DateSelector";
import { AdminSlotRow } from "@/components/AdminControls";

const DATE_COUNT = 7;

interface Props {
  initialTurfs: Turf[];
  initialTurfId: string | null;
  initialSlots: Slot[];
  initialDate: string;
  todayStr: string;
  staffEmail: string | null;
  configured: boolean;
}

/**
 * Interactive staff console (Client Component).
 * Server Component (app/admin/page.tsx) already verified session + staff
 * membership; this component keeps interactive slot controls client-side and
 * re-checks the session so expiry shows a clear state.
 */
export function AdminDashboard({
  initialTurfs,
  initialTurfId,
  initialSlots,
  initialDate,
  todayStr,
  staffEmail,
  configured: serverConfigured,
}: Props) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState<string | null>(staffEmail);
  const [isStaff, setIsStaff] = useState(true);
  const [turfs, setTurfs] = useState<Turf[]>(initialTurfs);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(initialTurfId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<Slot[]>(() => sortSlots(initialSlots));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<"live" | "reconnecting" | "disconnected">("live");
  const configured = serverConfigured && isSupabaseConfigured();
  const token = useRef(0);
  const inFlight = useRef<Set<string>>(new Set());
  const hasServerData = useRef(initialTurfs.length > 0);

  const dates = useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    const anchor = Date.UTC(y, m - 1, d, 12, 0, 0);
    return Array.from({ length: DATE_COUNT }, (_, i) => {
      return new Date(anchor + i * 86_400_000).toISOString().slice(0, 10);
    });
  }, [todayStr]);
  const selectedTurf = turfs.find((t) => t.id === selectedTurfId) ?? null;

  // Auth gate: unauthenticated -> /login (proxy also redirects);
  // authenticated-but-not-staff -> unauthorized state, no admin functionality.
  // Re-validates on mount so an expired session shows a clear state even
  // though the server already checked.
  useEffect(() => {
    if (!configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const supabase = createClient();
        const auth = await resolveAuthState(supabase);
        if (!auth.userId) {
          router.replace("/login?next=/admin");
          return;
        }
        setEmail(auth.email);
        setIsStaff(auth.isStaff);
        if (!auth.isStaff) {
          setError("This account is not authorized for staff access.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication check failed.");
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [configured, router]);

  const loadAll = useCallback(
    async (turfId: string, date: string) => {
      const t = ++token.current;
      setLoading(true);
      setError((prev) => (isStaff ? null : prev));
      try {
        const supabase = createClient();
        const turfRows = await fetchTurfs(supabase);
        if (token.current !== t) return;
        setTurfs(turfRows);
        const effectiveTurf = turfId ?? turfRows[0]?.id ?? null;
        if (!effectiveTurf) {
          setSlots([]);
          return;
        }
        setSelectedTurfId(effectiveTurf);
        const ensured = await ensureSlots(effectiveTurf, date);
        if (token.current !== t) return;
        setSlots(sortSlots(ensured));
      } catch (err) {
        if (token.current !== t) return;
        setError(err instanceof Error ? err.message : "Could not load schedule.");
      } finally {
        if (token.current === t) setLoading(false);
      }
    },
    [isStaff],
  );

  useEffect(() => {
    if (!authChecked || !isStaff || !configured) return;
    // Skip the first client fetch when the server already provided the view.
    if (hasServerData.current) {
      hasServerData.current = false;
      return;
    }
    // Schedule sync with Supabase on auth/date change — intentional effect.
    void loadAll(selectedTurfId ?? "", selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isStaff, selectedDate]);

  // Keep the turf list fresh on first load even before a turf is chosen.
  useEffect(() => {
    if (!authChecked || !isStaff || !configured || turfs.length > 0) return;
    // Initial turf-list sync — intentional effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll("", selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isStaff]);

  // Realtime for the admin's selected turf+date.
  useEffect(() => {
    if (!selectedTurfId || !isStaff || !configured) return;
    let cancelled = false;
    let hadDisconnect = false;
    const turfAtSubscribe = selectedTurfId;
    const dateAtSubscribe = selectedDate;
    const supabase = createClient();
    const sub = subscribeToSlots(
      supabase,
      turfAtSubscribe,
      dateAtSubscribe,
      ({ slot }) => {
        if (cancelled) return;
        if (slot.turf_id !== turfAtSubscribe) return;
        if (slot.slot_date !== dateAtSubscribe) return;
        setSlots((prev) => {
          const idx = prev.findIndex((s) => s.id === slot.id);
          if (idx === -1)
            return sortSlots([...prev, slot]);
          const next = [...prev];
          next[idx] = slot;
          return next;
        });
      },
      (msg) => {
        if (!cancelled) {
          hadDisconnect = true;
          setNotice(msg);
          setRealtimeState("disconnected");
        }
      },
      (status) => {
        if (cancelled) return;
        if (status === "subscribed") {
          setRealtimeState("live");
          // Reconcile after a disconnect so missed events can't leave stale UI.
          if (hadDisconnect) {
            hadDisconnect = false;
            void (async () => {
              try {
                const client = createClient();
                const rows = await fetchSlots(client, turfAtSubscribe, dateAtSubscribe);
                if (!cancelled) setSlots(sortSlots(rows));
              } catch {
                // Keep last known-good rows; the error banner covers failures.
              }
            })();
          }
        } else {
          hadDisconnect = true;
          setRealtimeState("reconnecting");
        }
      },
    );
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [selectedTurfId, selectedDate, isStaff, configured]);

  async function handleChange(slot: Slot, next: SlotStatus) {
    // Guard repeated clicks: same slot already updating, or a quick action running.
    if (inFlight.current.has(slot.id) || quickBusy) return;
    inFlight.current.add(slot.id);
    setBusyId(slot.id);
    setNotice(null);
    setError(null);
    const previous = slots;
    try {
      const supabase = createClient();
      const { slot: updated, conflict } = await updateSlotStatus(
        supabase,
        slot.id,
        next,
        { expectedOldStatus: slot.status },
      );
      if (conflict) {
        setNotice(
          `Slot ${slot.start_time} was already changed by someone else. Showing the latest state.`,
        );
      } else {
        setNotice(`Slot updated to ${next.toUpperCase()}.`);
      }
      setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      // No optimistic patch was applied, so nothing to roll back — keep the
      // last known-good rows and surface the failure.
      setSlots(previous);
      setError(err instanceof Error ? err.message : "Slot update failed.");
    } finally {
      inFlight.current.delete(slot.id);
      setBusyId(null);
    }
  }

  /** Quick action: book the next N free hours starting from now (today only). */
  async function bookNextHours(hours: 1 | 2) {
    if (!selectedTurfId || quickBusy) return;
    setQuickBusy(true);
    setNotice(null);
    setError(null);
    try {
      const supabase = createClient();
      const rows = await fetchSlots(supabase, selectedTurfId, selectedDate);
      const nowMin = selectedDate === todayStr ? getBusinessMinutes() : 0;
      const upcoming = sortSlots(rows).filter(
        (s) => timeToMinutes(s.start_time) >= nowMin && s.status === "free",
      );
      const targets = upcoming.slice(0, hours);
      if (targets.length === 0) {
        setNotice("No free upcoming slots to book.");
        return;
      }
      for (const target of targets) {
        const { slot: updated } = await updateSlotStatus(supabase, target.id, "booked", {
          expectedOldStatus: "free",
        });
        setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      }
      setNotice(`Booked next ${targets.length} hour(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quick-book failed.");
    } finally {
      setQuickBusy(false);
    }
  }

  async function freeRemaining() {
    if (!selectedTurfId || quickBusy) return;
    setQuickBusy(true);
    setNotice(null);
    setError(null);
    try {
      const supabase = createClient();
      const nowMin = selectedDate === todayStr ? getBusinessMinutes() : 0;
      const freed = await freeRemainingSlotsToday(
        supabase,
        selectedTurfId,
        selectedDate,
        nowMin,
        timeToMinutes,
      );
      const rows = await fetchSlots(supabase, selectedTurfId, selectedDate);
      setSlots(sortSlots(rows));
      setNotice(freed === 0 ? "Nothing to free — remaining slots are already free." : `Freed ${freed} slot(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Free-remaining failed.");
    } finally {
      setQuickBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const liveStatus = useMemo(() => getCurrentStatus(slots), [slots]);

  if (!configured) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 p-4">
        <div role="alert" className="rounded-2xl bg-amber-500/15 p-4 text-sm text-amber-200 ring-1 ring-amber-500/40">
          Supabase is not configured. See <code>.env.example</code> and README.
        </div>
      </main>
    );
  }

  if (!authChecked || (loading && turfs.length === 0)) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 p-4">
        <p role="status" className="text-sm text-zinc-400">Loading admin…</p>
      </main>
    );
  }

  if (authChecked && !isStaff) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
        <h1 className="text-xl font-bold text-white">Not authorized</h1>
        <p role="alert" className="rounded-2xl bg-red-500/15 p-4 text-sm text-red-200 ring-1 ring-red-500/40">
          {error ?? "This account is not authorized for staff access."} Sign in with a staff account{email ? ` (currently ${email})` : ""}.
        </p>
        <button onClick={signOut} className="min-h-12 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 pb-10">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-white">Staff Admin</h1>
          <p className="text-xs text-zinc-400">{email} · tap a slot to update (1–2 taps)</p>
        </div>
        <button
          onClick={signOut}
          className="min-h-11 shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Sign out
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl bg-red-500/15 p-3 text-sm text-red-200 ring-1 ring-red-500/40">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl bg-emerald-500/15 p-3 text-sm text-emerald-200 ring-1 ring-emerald-500/40">
          {notice}
        </div>
      )}
      {realtimeState !== "live" && (
        <div role="status" className="rounded-2xl bg-amber-500/15 p-3 text-xs text-amber-200 ring-1 ring-amber-500/40">
          {realtimeState === "reconnecting" ? "Reconnecting live updates…" : "Live updates disconnected. Changes may require refresh."}
        </div>
      )}

      <TurfSelector
        turfs={turfs}
        selectedId={selectedTurfId}
        onSelect={(id) => {
          setSelectedTurfId(id);
          void loadAll(id, selectedDate);
        }}
      />

      <StatusBanner status={liveStatus} loading={loading} />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick actions">
        <button disabled={quickBusy} onClick={() => void bookNextHours(1)} className="min-h-11 flex-1 rounded-xl bg-red-500/20 px-3 py-2 text-xs font-black text-red-100 ring-1 ring-red-500/40 hover:bg-red-500/30 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
          Book next 1h
        </button>
        <button disabled={quickBusy} onClick={() => void bookNextHours(2)} className="min-h-11 flex-1 rounded-xl bg-red-500/20 px-3 py-2 text-xs font-black text-red-100 ring-1 ring-red-500/40 hover:bg-red-500/30 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
          Book next 2h
        </button>
        <button disabled={quickBusy} onClick={() => void freeRemaining()} className="min-h-11 flex-1 rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-black text-emerald-100 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
          Free remaining today
        </button>
      </div>

      <section aria-label="Daily schedule">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          {selectedTurf?.name ?? "Schedule"} · {selectedDate === todayStr ? "Today" : selectedDate}
        </h2>
        <DateSelector dates={dates} selected={selectedDate} todayStr={todayStr} onSelect={setSelectedDate} />
        <div className="mt-3">
          {loading ? (
            <p role="status" className="text-sm text-zinc-400">Loading slots…</p>
          ) : slots.length === 0 ? (
            <p role="status" className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
              No slots for this date.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {slots.map((s) => {
                const past =
                  s.slot_date < todayStr ||
                  (s.slot_date === todayStr && timeToMinutes(s.end_time) <= getBusinessMinutes());
                return (
                  <AdminSlotRow
                    key={s.id}
                    slot={s}
                    busy={busyId === s.id || quickBusy}
                    isPast={past}
                    onChange={(slot, next) => void handleChange(slot, next)}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </section>
      <p className="text-[11px] text-zinc-500">
        Every update records updated_at / updated_by plus an audit row, and public dashboards refresh live.
      </p>
    </main>
  );
}
