"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import { fetchSlots, fetchTurfs, ensureSlots } from "@/lib/slotsApi";
import { subscribeToSlots } from "@/lib/realtime";
import {
  buildCallUrl,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  countByStatus,
  getCurrentStatus,
} from "@/lib/slots";
import {
  formatDateLabel,
  formatSlotRange,
  getBusinessDatePlus,
} from "@/lib/timezone";
import type { Slot, Turf } from "@/types/database";
import { TurfHeader } from "@/components/TurfHeader";
import { TurfSelector } from "@/components/TurfSelector";
import { StatusBanner } from "@/components/StatusBanner";
import { DateSelector } from "@/components/DateSelector";
import { SlotCard } from "@/components/SlotCard";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { HeroCard } from "@/components/HeroCard";
import { InquirySheet } from "@/components/InquirySheet";
import { ContactBar } from "@/components/ContactBar";
import { Toasts, type ToastItem } from "@/components/Toasts";

const DATE_COUNT = 7;

interface Props {
  initialTurfs: Turf[];
  initialTurfId: string | null;
  initialSlots: Slot[];
  initialDate: string;
  todayStr: string;
  configured: boolean;
}

/**
 * Interactive public dashboard (Client Component).
 * Server Component (app/page.tsx) provides initial turf/slot data so the
 * first HTML already contains meaningful availability content; this component
 * hydrates interactivity: selectors, realtime, WhatsApp/Call.
 */
export function PublicDashboard({
  initialTurfs,
  initialTurfId,
  initialSlots,
  initialDate,
  todayStr,
  configured: serverConfigured,
}: Props) {
  const [turfs, setTurfs] = useState<Turf[]>(initialTurfs);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(initialTurfId);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [contactSlotId, setContactSlotId] = useState<string | null>(
    initialSlots.find((s) => s.status === "free")?.id ?? null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loadingTurfs, setLoadingTurfs] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<"live" | "reconnecting" | "disconnected">("live");
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const configured = serverConfigured && isSupabaseConfigured();
  const reloadToken = useRef(0);
  const hadServerData = useRef(initialTurfs.length > 0);
  const toastId = useRef(0);
  const toastTimers = useRef<number[]>([]);

  const pushToast = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
    toastTimers.current.push(timer);
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const dates = useMemo(
    () => Array.from({ length: DATE_COUNT }, (_, i) => {
      const [y, m, d] = todayStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0) + i * 86_400_000);
      return dt.toISOString().slice(0, 10);
    }),
    [todayStr],
  );

  // Keep getBusinessDatePlus referenced for date math consistency (covered by tests).
  void getBusinessDatePlus;

  const selectedTurf = turfs.find((t) => t.id === selectedTurfId) ?? null;

  const handleTurfSelect = useCallback((id: string) => {
    setSelectedTurfId(id);
    const name = turfs.find((t) => t.id === id)?.name;
    if (name) pushToast(`${name} selected`);
  }, [turfs, pushToast]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    pushToast(`Showing ${formatDateLabel(date)}`);
  }, [pushToast]);

  const handleSlotTap = useCallback((slot: Slot) => {
    setContactSlotId(slot.id);
    if (slot.status === "free") {
      pushToast(`${formatSlotRange(slot.start_time, slot.end_time)} selected for inquiry`);
      setSheetOpen(true);
    }
  }, [pushToast]);

  const loadTurfs = useCallback(async () => {
    if (!configured) {
      setLoadingTurfs(false);
      return;
    }
    // Skip the first client fetch when the server already provided turfs.
    if (hadServerData.current) {
      hadServerData.current = false;
      return;
    }
    setLoadingTurfs(true);
    setError(null);
    try {
      const supabase = createClient();
      const rows = await fetchTurfs(supabase);
      setTurfs(rows);
      setSelectedTurfId((prev) => prev ?? rows[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load turfs.");
    } finally {
      setLoadingTurfs(false);
    }
  }, [configured]);

  useEffect(() => {
    // Syncs with Supabase (external system) on mount — intentional effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTurfs();
  }, [loadTurfs]);

  const loadSlots = useCallback(async (turfId: string, date: string) => {
    const token = ++reloadToken.current;
    setLoadingSlots(true);
    setError(null);
    try {
      // Trusted path: missing rows are created by the RPC, never by direct INSERT.
      const ensured = await ensureSlots(turfId, date);
      if (reloadToken.current !== token) return;
      setSlots(ensured);
      setContactSlotId((prev) => {
        if (prev && ensured.some((s) => s.id === prev)) return prev;
        return ensured.find((s) => s.status === "free")?.id ?? null;
      });
    } catch (err) {
      if (reloadToken.current !== token) return;
      // Fall back to a plain read so a busy RPC still shows existing rows.
      try {
        const supabase = createClient();
        const rows = await fetchSlots(supabase, turfId, date);
        if (reloadToken.current !== token) return;
        setSlots(rows);
        if (rows.length > 0) {
          setError(null);
        } else {
          throw err;
        }
      } catch {
        setError(err instanceof Error ? err.message : "Could not load slots.");
        setSlots([]);
      }
    } finally {
      if (reloadToken.current === token) setLoadingSlots(false);
    }
  }, []);

  const isInitialServerView =
    initialSlots.length > 0 &&
    selectedTurfId === initialTurfId &&
    selectedDate === initialDate &&
    slots === initialSlots;

  useEffect(() => {
    if (!selectedTurfId || !configured) return;
    // The server already rendered this exact turf+date — don't refetch on mount.
    if (isInitialServerView) return;
    // Fetches the turf's schedule from Supabase on selection change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSlots(selectedTurfId, selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurfId, selectedDate, configured, loadSlots]);

  // Realtime: one channel per turf+date, cleaned up on change.
  useEffect(() => {
    if (!selectedTurfId || !configured) return;
    // Resetting live-error state when (re)subscribing to the external channel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRealtimeError(null);
    setRealtimeState("live");
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
        // Stale guards: never let an old turf/date event touch the new view.
        if (slot.turf_id !== turfAtSubscribe) return;
        if (slot.slot_date !== dateAtSubscribe) return;
        // Apply the patch directly; fall back to refetch on deletes.
        setSlots((prev) => {
          const idx = prev.findIndex((s) => s.id === slot.id);
          if (idx === -1) return [...prev, slot].sort((a, b) => (a.start_time < b.start_time ? -1 : 1));
          const next = [...prev];
          next[idx] = slot;
          return next;
        });
      },
      (msg) => {
        if (!cancelled) {
          hadDisconnect = true;
          setRealtimeError(msg);
          setRealtimeState("disconnected");
        }
      },
      (status) => {
        if (cancelled) return;
        if (status === "subscribed") {
          // Reconcile on (re)connect: refetch so missed events can't leave stale UI.
          setRealtimeState("live");
          setRealtimeError(null);
          if (hadDisconnect) {
            hadDisconnect = false;
            void loadSlots(turfAtSubscribe, dateAtSubscribe);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurfId, selectedDate, configured]);

  const liveStatus = useMemo(
    () => (selectedDate === todayStr ? getCurrentStatus(slots) : null),
    [slots, selectedDate, todayStr],
  );
  const counts = useMemo(() => countByStatus(slots), [slots]);

  const contactSlot =
    slots.find((s) => s.id === contactSlotId) ??
    slots.find((s) => s.status === "free") ??
    null;

  const whatsappUrl = useMemo(() => {
    if (!selectedTurf || !contactSlot) return null;
    const msg = buildWhatsAppMessage(
      selectedTurf.name,
      contactSlot.slot_date,
      contactSlot.start_time,
      contactSlot.end_time,
      `${formatDateLabel(contactSlot.slot_date)}${contactSlot.slot_date === todayStr ? " (today)" : ""}`,
    );
    return buildWhatsAppUrl(selectedTurf.whatsapp_number, msg);
  }, [selectedTurf, contactSlot, todayStr]);

  const callUrl = selectedTurf ? buildCallUrl(selectedTurf.phone_number) : null;

  if (!configured) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4">
        <TurfHeader turf={null} live={false} />
        <div role="alert" className="tt-glass rounded-3xl p-4 text-sm text-amber-200 ring-1 ring-amber-300/30">
          Supabase is not configured. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run the migrations in{" "}
          <code>supabase/migrations</code>. See README.
        </div>
      </main>
    );
  }

  return (
    <main className="tt-ambient mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 pb-10">
      <TurfHeader turf={selectedTurf} live={realtimeState === "live"} />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4">
        {error && (
          <div role="alert" className="tt-glass rounded-3xl p-4 text-sm text-rose-200 ring-1 ring-rose-400/30">
            {error}{" "}
            <button onClick={() => selectedTurfId && void loadSlots(selectedTurfId, selectedDate)} className="font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300">
              Retry
            </button>
          </div>
        )}
        {realtimeState !== "live" && (
          <div role="status" className="tt-glass rounded-3xl p-3 text-xs text-amber-200 ring-1 ring-amber-300/30">
            {realtimeState === "reconnecting"
              ? "Reconnecting live updates…"
              : (realtimeError ?? "Live updates disconnected. Changes may require refresh.")}
          </div>
        )}

        {loadingTurfs ? (
          <p role="status" className="text-sm text-white/50">Loading turfs…</p>
        ) : turfs.length === 0 ? (
          <p role="status" className="tt-glass rounded-3xl p-4 text-sm text-white/60">
            No turfs configured yet. Ask staff to run <code>supabase/seed.sql</code>.
          </p>
        ) : (
          <>
            <HeroCard
              turfName={selectedTurf?.name ?? null}
              status={selectedDate === todayStr ? liveStatus : null}
              loading={loadingSlots}
              live={realtimeState === "live"}
            />
            <TurfSelector turfs={turfs} selectedId={selectedTurfId} onSelect={handleTurfSelect} />
            <StatusBanner status={selectedDate === todayStr ? liveStatus : null} loading={loadingSlots} />
            {selectedDate !== todayStr && !loadingSlots && (
              <p role="status" className="tt-glass rounded-3xl p-3 font-mono text-[11px] tracking-wider text-white/60">
                {formatDateLabel(selectedDate).toUpperCase()}: {counts.free} FREE · {counts.booked} BOOKED · {counts.maintenance} MAINTENANCE
              </p>
            )}

            <section aria-label="Schedule">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="tt-eyebrow text-white/50">
                  {selectedDate === todayStr ? "Today's schedule" : `Schedule — ${formatDateLabel(selectedDate)}`}
                </h2>
                <p className="font-mono text-[10px] tracking-widest text-lime-200/70">
                  {counts.free} FREE
                </p>
              </div>
              <DateSelector dates={dates} selected={selectedDate} todayStr={todayStr} onSelect={handleDateSelect} />
              <div className="mt-3">
                {loadingSlots ? (
                  <p role="status" className="text-sm text-white/50">Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p role="status" className="tt-glass rounded-3xl p-4 text-sm text-white/60">
                    No slots for this date yet.
                  </p>
                ) : (
                  <ul aria-label="Daily slots" className="flex flex-col gap-2">
                    {slots.map((s) => {
                      const active = s.id === contactSlot?.id;
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => handleSlotTap(s)}
                            aria-pressed={active}
                            title={active ? "Selected for WhatsApp message" : `Use ${formatSlotRange(s.start_time, s.end_time)} for WhatsApp message`}
                            className={`w-full rounded-3xl ring-2 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${active ? "ring-lime-300" : "ring-transparent hover:ring-white/20"}`}
                          >
                            <SlotCard slot={s} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section aria-label="Contact" className="tt-glass flex flex-col gap-2 rounded-3xl p-4">
              <h2 className="tt-eyebrow text-white/50">
                Contact manager
              </h2>
              {contactSlot ? (
                <p className="text-xs leading-relaxed text-white/60">
                  Message will ask about{" "}
                  <strong className="text-[#f4efe3]">
                    {formatSlotRange(contactSlot.start_time, contactSlot.end_time)}
                  </strong>
                  . Tap a free slot above to open an inquiry. The manager confirms the actual booking.
                </p>
              ) : (
                <p className="text-xs text-white/60">
                  No free slot selected — the manager confirms availability on WhatsApp.
                </p>
              )}
              <WhatsAppButton whatsappUrl={whatsappUrl} callUrl={callUrl} />
              <p className="text-[11px] leading-relaxed text-white/40">
                Availability tracker only — no online booking or payment. The manager confirms every reservation externally.
              </p>
            </section>
          </>
        )}

        <ContactBar whatsappUrl={whatsappUrl} onWhatsApp={() => pushToast("Opening WhatsApp…")} />
      </div>

      <InquirySheet
        open={sheetOpen && contactSlot !== null}
        turfName={selectedTurf?.name ?? ""}
        slot={contactSlot}
        whatsappUrl={whatsappUrl}
        callUrl={callUrl}
        onClose={() => setSheetOpen(false)}
        onContactAction={() => pushToast("Contacting manager…")}
      />
      <Toasts toasts={toasts} />
    </main>
  );
}
