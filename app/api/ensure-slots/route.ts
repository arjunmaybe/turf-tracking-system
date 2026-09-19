import { NextResponse } from "next/server";
import { ensureDailySlotsServer } from "@/lib/serverSlots";
import {
  checkRateLimit,
  clientIpFromHeaders,
  ENSURE_SLOTS_RATE_LIMIT_BINDING,
  ensureSlotsRateLimitKey,
  RATE_LIMIT_RETRY_AFTER_SECONDS,
} from "@/lib/rateLimit";
import { isValidDateString, isValidUuid } from "@/lib/timezone";

/**
 * POST /api/ensure-slots { turf_id, slot_date }
 *
 * Trusted slot-generation path. Public callers are read-only on tables AND
 * cannot execute the RPC directly (EXECUTE revoked from anon/authenticated
 * in 0004). This route invokes the SECURITY DEFINER RPC ensure_daily_slots()
 * via the server-only privileged helper, which idempotently inserts only
 * missing 'free' rows for the turf's own grid.
 *
 * Strict validation: uuid + YYYY-MM-DD + allowed window (past 7d .. +90d,
 * matching the RPC). RPC responses are validated defensively and errors are
 * sanitized — never leak SQL / stack traces / secrets.
 */
export async function POST(req: Request) {
  // Abuse protection first (Workers only, fail-open elsewhere): repeated
  // automated calls from one IP eventually receive 429. Normal dashboard
  // browsing (worst case ~14 rapid turf/date calls) stays far under the limit.
  const { allowed } = await checkRateLimit(
    ENSURE_SLOTS_RATE_LIMIT_BINDING,
    ensureSlotsRateLimitKey(clientIpFromHeaders(req.headers)),
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { turf_id, slot_date } = (body ?? {}) as {
    turf_id?: unknown;
    slot_date?: unknown;
  };

  if (typeof turf_id !== "string" || !isValidUuid(turf_id)) {
    return NextResponse.json({ error: "Invalid turf_id" }, { status: 400 });
  }
  if (typeof slot_date !== "string" || !isValidDateString(slot_date)) {
    return NextResponse.json(
      { error: "Invalid slot_date (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  // Defense-in-depth window check (RPC enforces authoritatively).
  // Uses UTC calendar days; RPC uses DB current_date — close enough for a
  // pre-check, RPC remains the source of truth.
  try {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const min = shiftDate(todayUtc, -7);
    const max = shiftDate(todayUtc, 90);
    if (slot_date < min || slot_date > max) {
      return NextResponse.json({ error: "Date out of range" }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid slot_date (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  let slots;
  try {
    // Server-only service_role path — the browser can never call the RPC itself.
    slots = await ensureDailySlotsServer(turf_id, slot_date);
  } catch (err) {
    // PostgREST failures may arrive as plain { message } objects rather than
    // Error instances — extract defensively so known cases still map to 400.
    const msg = errorMessage(err);
    // Known client errors -> 400 with a stable message. Everything else is a
    // generic 500 — never echo raw SQL / driver details to the client.
    if (msg.includes("date out of range")) {
      return NextResponse.json({ error: "Date out of range" }, { status: 400 });
    }
    if (msg.includes("turf not found")) {
      return NextResponse.json({ error: "Turf not found" }, { status: 400 });
    }
    if (msg.includes("invalid slot duration") || msg.includes("invalid turf opening hours")) {
      return NextResponse.json({ error: "Turf schedule is misconfigured" }, { status: 400 });
    }
    if (msg.includes("not configured")) {
      return NextResponse.json(
        { error: "Slot generation is not configured. See .env.example." },
        { status: 500 },
      );
    }
    console.error("ensure_daily_slots failed:", msg);
    return NextResponse.json(
      { error: "Could not load slots. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ slots });
}

/** Extracts a message from Error instances AND plain PostgREST { message } objects. */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message ?? "";
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    return typeof m === "string" ? m : "";
  }
  return "";
}

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0) + days * 86_400_000);
  return dt.toISOString().slice(0, 10);
}
