import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ensureDailySlotsServer } from "@/lib/serverSlots";
import { getStaffRole } from "@/lib/auth";
import { getBusinessDateString } from "@/lib/timezone";
import type { Slot, Turf } from "@/types/database";

export const metadata: Metadata = {
  title: "Staff Admin",
  description: "Staff console for managing turf slot availability.",
  robots: { index: false, follow: false },
};

/**
 * /admin — Server Component.
 * Verifies the session server-side before showing any admin content and
 * preserves the existing staff model (public.staff is the authorization
 * source). Interactive slot controls stay client-side in <AdminDashboard />.
 * RLS remains the real enforcement; this is defense in depth + correct UX.
 */
export default async function AdminPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const todayStr = getBusinessDateString();

  if (!configured) {
    return (
      <AdminDashboard
        initialTurfs={[]}
        initialTurfId={null}
        initialSlots={[]}
        initialDate={todayStr}
        todayStr={todayStr}
        staffEmail={null}
        configured={false}
      />
    );
  }

  let supabase;
  try {
    supabase = await createServerSupabaseClient();
  } catch {
    return (
      <AdminDashboard
        initialTurfs={[]}
        initialTurfId={null}
        initialSlots={[]}
        initialDate={todayStr}
        todayStr={todayStr}
        staffEmail={null}
        configured={false}
      />
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const role = await getStaffRole(supabase, user.id);
  if (!role) {
    // Server-side unauthorized state: no schedule data is fetched or shown.
    // The client dashboard also re-checks and offers sign-out.
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-4">
        <h1 className="text-xl font-bold text-white">Not authorized</h1>
        <p
          role="alert"
          className="rounded-2xl bg-red-500/15 p-4 text-sm text-red-200 ring-1 ring-red-500/40"
        >
          This account is not authorized for staff access. Sign in with a staff
          account{user.email ? ` (currently ${user.email})` : ""}.
        </p>
        <p className="text-xs text-zinc-500">
          Only users listed in the <code>staff</code> table can use /admin.
          Database RLS enforces this independently of the UI.
        </p>
      </main>
    );
  }

  let turfs: Turf[] = [];
  let slots: Slot[] = [];
  let selectedTurfId: string | null = null;

  try {
    const { data: turfRows } = await supabase
      .from("turfs")
      .select("*")
      .order("name", { ascending: true });
    turfs = ((turfRows ?? []) as Turf[]).filter(
      (t) => typeof t.id === "string" && typeof t.name === "string",
    );
    selectedTurfId = turfs[0]?.id ?? null;
    if (selectedTurfId) {
      // Trusted generation path server-side via the server-only helper
      // (service_role RPC — the browser can never execute it directly).
      try {
        slots = await ensureDailySlotsServer(selectedTurfId, todayStr);
      } catch {
        const { data: rows } = await supabase
          .from("slots")
          .select("*")
          .eq("turf_id", selectedTurfId)
          .eq("slot_date", todayStr)
          .order("start_time", { ascending: true });
        slots = ((rows ?? []) as Slot[]).filter(
          (s) => s.turf_id === selectedTurfId && s.slot_date === todayStr,
        );
      }
    }
  } catch {
    // Best-effort: client dashboard refetches with error states.
  }

  return (
    <AdminDashboard
      initialTurfs={turfs}
      initialTurfId={selectedTurfId}
      initialSlots={slots}
      initialDate={todayStr}
      todayStr={todayStr}
      staffEmail={user.email ?? null}
      configured={configured}
    />
  );
}
