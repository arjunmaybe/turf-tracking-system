import type { Metadata } from "next";
import { PublicDashboard } from "@/components/PublicDashboard";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ensureDailySlotsServer } from "@/lib/serverSlots";
import { getCurrentStatus } from "@/lib/slots";
import { getBusinessDateString } from "@/lib/timezone";
import { getSiteUrl } from "@/lib/site";
import type { Slot, Turf } from "@/types/database";

export const metadata: Metadata = {
  title: "Live Turf Availability",
  description:
    "Check live football turf slot availability. Availability tracker only — no online booking or payment. The manager confirms every reservation.",
  alternates: { canonical: `${getSiteUrl()}/` },
  openGraph: {
    type: "website",
    url: `${getSiteUrl()}/`,
    title: "Turf Slot Tracking — Live Availability",
    description:
      "Live football turf availability. The manager confirms every reservation externally.",
  },
};

interface PageProps {
  searchParams?: Promise<{ turf?: string; date?: string }>;
}

/**
 * Public homepage — Server Component.
 * Fetches initial turf + slot data server-side so the first HTML already
 * contains meaningful availability content. Interactivity (selectors,
 * realtime, WhatsApp) hydrates in <PublicDashboard />.
 */
export default async function HomePage({ searchParams }: PageProps) {
  const todayStr = getBusinessDateString();
  const siteConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!siteConfigured) {
    return (
      <PublicDashboard
        initialTurfs={[]}
        initialTurfId={null}
        initialSlots={[]}
        initialDate={todayStr}
        todayStr={todayStr}
        configured={false}
      />
    );
  }

  let turfs: Turf[] = [];
  let slots: Slot[] = [];
  let selectedTurfId: string | null = null;
  let selectedDate = todayStr;

  try {
    const params = searchParams ? await searchParams : {};
    const supabase = await createServerSupabaseClient();
    const { data: turfRows } = await supabase
      .from("turfs")
      .select("*")
      .order("name", { ascending: true });
    turfs = ((turfRows ?? []) as Turf[]).filter(
      (t) => typeof t.id === "string" && typeof t.name === "string",
    );

    const requestedTurf =
      typeof params.turf === "string"
        ? turfs.find((t) => t.id === params.turf)?.id
        : undefined;
    selectedTurfId = requestedTurf ?? turfs[0]?.id ?? null;

    const requestedDate =
      typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
        ? params.date
        : todayStr;
    selectedDate = requestedDate;

    if (selectedTurfId) {
      // Trusted generation path server-side via the server-only helper
      // (service_role RPC — the browser can never execute it directly).
      // Idempotent; existing rows are never modified. Falls back to a plain
      // read when generation is unavailable.
      try {
        slots = await ensureDailySlotsServer(selectedTurfId, selectedDate);
      } catch {
        const { data: rows } = await supabase
          .from("slots")
          .select("*")
          .eq("turf_id", selectedTurfId)
          .eq("slot_date", selectedDate)
          .order("start_time", { ascending: true });
        slots = ((rows ?? []) as Slot[]).filter(
          (s) => s.turf_id === selectedTurfId && s.slot_date === selectedDate,
        );
      }
    }
  } catch {
    // Server fetch is best-effort: the client dashboard refetches and shows
    // loading/error states. Never crash SSR on Supabase failure.
    if (turfs.length > 0 && !selectedTurfId) {
      selectedTurfId = turfs[0]?.id ?? null;
    }
  }

  // Compute once for potential server-rendered consumers; the dashboard
  // recomputes live after hydration.
  void getCurrentStatus;

  return (
    <PublicDashboard
      initialTurfs={turfs}
      initialTurfId={selectedTurfId}
      initialSlots={slots}
      initialDate={selectedDate}
      todayStr={todayStr}
      configured={siteConfigured}
    />
  );
}
