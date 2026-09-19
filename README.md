# Turf Slot Tracking System

> **This is a turf availability tracking system, not an online booking/payment system.**
>
> Players view which slots are free / booked / under maintenance and contact the
> manager via WhatsApp or phone. The manager confirms every reservation
> externally. There is no online payment, no customer accounts, no automated
> customer booking, no checkout, and no payment gateway.

The facility has **2 football turfs**. The homepage shows both, each with its
own live schedule, current-status banner, and realtime updates. Staff manage
both turfs from `/admin`.

## Features

- **Public dashboard (`/`)** — mobile-first, dark theme:
  - Turf selector (Turf 1 | Turf 2), each with an independent schedule
  - Current-status banner (`FREE` / `BOOKED — Until …` / `MAINTENANCE`), computed
    from business-time now vs `slot_date + start/end` (never "first booked slot")
  - Chronological slot grid (green = free, red = booked, amber = maintenance)
  - Date selector (today + 6 days)
  - Tap-a-slot to target the WhatsApp message; dynamic message like
    *"Hi, I'd like to reserve the 7 PM – 8 PM slot at Turf 1 on Mon, 15 Sep (today). Is it available?"*
  - WhatsApp + Call buttons; realtime updates without refresh
- **Staff admin (`/admin`)** — phone-fast (1–2 taps per update):
  - Turf switcher + date selector + live banner + `updated_at` per slot
  - Per-slot FREE / BOOKED / MAINTENANCE buttons, past-slot confirmation
  - Quick actions: Book next 1h, Book next 2h, Free remaining today
  - Optimistic UI + conflict detection (stale writes surface instead of silently overwriting)
- **Slot generation** — deterministic grid from turf settings (e.g. 06:00–23:00
  @ 60 min → 17 slots), idempotent via `UNIQUE(turf_id, slot_date, start_time)`
- **Audit** — every staff update writes `slot_changes` (old/new status, user, time)
- **Realtime** — one Supabase channel per selected turf+date, with cleanup and
  disconnect messaging

## Architecture

```text
PUBLIC → Next.js / page → SELECT + realtime (turf_id + slot_date) → Supabase PG
STAFF  → /login (Supabase Auth) → /admin → UPDATE (RLS-checked) → realtime → public refresh

Slot creation: UI → POST /api/ensure-slots → server-only service_role helper
                → RPC ensure_daily_slots() [SECURITY DEFINER]
                (public stays read-only on tables AND cannot EXECUTE the RPC;
                 the RPC only inserts missing 'free' rows)
```

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4
- Supabase: PostgreSQL + Auth (email/password) + Realtime, `@supabase/ssr`
- Tests: Vitest + React Testing Library + jsdom
- Deploy: Cloudflare Workers via vinext (Vite plugin, non-destructive `vinext init`)

## Database schema

`supabase/migrations/0001_schema.sql`:

- **turfs** — `id uuid pk`, `name`, `open_time time`, `close_time time`,
  `slot_duration_minutes int default 60`, `phone_number`, `whatsapp_number`,
  `created_at`; checks: name non-empty, duration 1–480, open < close
- **slots** — `id`, `turf_id → turfs cascade`, `slot_date date`, `start_time time`,
  `end_time time`, `status default 'free'`, `updated_at`, `updated_by → auth.users`;
  checks: `end > start`, `status ∈ {free, booked, maintenance}`;
  `UNIQUE(turf_id, slot_date, start_time)`; indexes on `turf_id`, `slot_date`,
  `(turf_id, slot_date)`; trigger keeps `updated_at` fresh
- **staff** — `user_id pk → auth.users cascade`, `role default 'staff'`,
  check `role ∈ {staff, owner}`
- **slot_changes** — `id`, `slot_id → slots cascade`, `user_id → auth.users`,
  `old_status`, `new_status`, `changed_at`; status checks; indexes on
  `slot_id`, `changed_at`

`0003_ensure_slots_rpc.sql` adds `ensure_daily_slots(p_turf_id uuid, p_slot_date date)`:
`SECURITY DEFINER`, reads the turf's hours, inserts the day grid with
`ON CONFLICT DO NOTHING`, returns the day's rows. Date window: past 7 d … future 90 d.

## Authentication model

- Supabase Auth, email/password, `@supabase/ssr` cookie sessions
- `proxy.ts` refreshes the session and redirects unauthenticated `/admin` → `/login?next=/admin`
- `/admin` additionally resolves **explicit** staff membership (`public.staff`);
  authenticated-but-not-staff sees a "Not authorized" state with sign-out — no admin functionality
- React guards are UX only; RLS is the real enforcement

## RLS security model (`0002_rls.sql`)

- `is_staff()` — `SECURITY DEFINER`, `SELECT EXISTS (… FROM staff WHERE user_id = auth.uid())`
- **turfs / slots**: `SELECT` to `anon, authenticated`; **no** INSERT/UPDATE/DELETE
  policies for anon; slots has exactly one write policy:
  `slots_update_staff … TO authenticated USING (is_staff()) WITH CHECK (is_staff())`
- **staff**: `SELECT` to authenticated `USING (is_staff())` only; no client writes
  (manage via SQL)
- **slot_changes**: `SELECT` + `INSERT` for staff only; inserts require `user_id = auth.uid()`
- There is deliberately **no** `FOR ALL TO authenticated` policy and **no** table
  INSERT policy for anon — missing slots are created only inside the RPC.
  Direct `EXECUTE` on `ensure_daily_slots` is revoked from `anon, authenticated`
  (see `0004_revoke_generation_rpc.sql`); only the trusted Next.js server path
  (`lib/serverSlots.ts`, `SUPABASE_SERVICE_ROLE_KEY` server-only) may invoke it.
- Browser uses only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  `service_role` never appears in client code, `NEXT_PUBLIC_*` variables, or API responses.

## Environment variables

See `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_BUSINESS_TIMEZONE=Asia/Kolkata
```

`.env*` is git-ignored except `.env.example`. Never commit real keys.

## Environment tiers

- **Local/dev** — copy `.env.example` to `.env.local`, fill in the Supabase
  URL + anon key from your dev project. Leave `NEXT_PUBLIC_SITE_URL` empty;
  the app falls back to `http://localhost:3000` so dev never becomes canonical.
- **Staging/preview** — use the staging Supabase project credentials.
  Leave `NEXT_PUBLIC_SITE_URL` empty (or set it to the staging URL only if
  you intentionally want staging canonicals); preview deployments serve a
  non-indexable `robots.txt` so staging never becomes the production canonical.
- **Production** — set `NEXT_PUBLIC_SITE_URL` to the real production domain
  (e.g. `https://turf.example.com`) plus the production Supabase URL + anon
  key. Never use the `service_role` key in any tier — client and server code
  use the anon key only, with RLS as the enforcement boundary. The single
  exception is `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix, never
  committed, never sent to the browser), used server-side only by
  `lib/serverSlots.ts` to invoke slot generation.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values (SITE_URL optional locally)
npm run dev                  # http://localhost:3000
```

Without Supabase credentials the app still builds and shows a setup banner
instead of crashing.

## Supabase setup

1. Create a project at https://supabase.com/dashboard
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (never the service_role key)
4. Copy **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only env, never `NEXT_PUBLIC_`, never committed — enables trusted slot generation)
5. Enable Email auth (Authentication → Providers → Email)
6. Enable Realtime for `public.slots` (Database → Replication → slots)

## Running migrations

Apply in order (Supabase SQL editor, or `supabase db push` if using the CLI):

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_ensure_slots_rpc.sql`
4. `supabase/migrations/0004_revoke_generation_rpc.sql` (revokes direct RPC EXECUTE from anon/authenticated)
5. `supabase/seed.sql` (creates Turf 1 + Turf 2; edit phone/WhatsApp numbers first)

## Creating the first staff/admin account

```sql
-- 1. Sign up the user once via the app (/login needs an existing user —
--    create it in Dashboard → Authentication → Users, or via signUp API).
-- 2. Insert them into staff (use their auth.users id):
insert into public.staff (user_id, role)
values ('<auth-user-uuid>', 'owner');
```

Only rows in `public.staff` can write. Adding more staff = create auth user + insert row.

## Running development server

```bash
npm run dev
```

- `/` public tracker, `/login` staff sign-in, `/admin` staff console.

## Running tests / build

The lint command is the project's own (`eslint` via `npm run lint` —
Next 16 no longer ships `next lint`).

```bash
npm run test        # vitest run — 118 tests
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (must be clean)
npm run build       # next build (Turbopack)
```

## Cloudflare Workers (vinext)

Production target is **Cloudflare Workers** (not Pages, not Vercel), following
the current Cloudflare-recommended vinext path. Migration is non-destructive:
`next dev` / `next build` keep working alongside the Workers workflow.

```bash
npm run dev:vinext    # vinext dev server (Workers-compatible, :3001)
npm run build:vinext  # vinext production build -> dist/
npm run start:vinext  # local workerd preview of the production build
npm run deploy:vinext # deploy to Workers (requires Cloudflare access)
```

Notes:

- `vite.config.ts` + `wrangler.jsonc` are generated by `vinext init`
  (Cloudflare target, no CDN cache, no image optimization — a live tracker
  must not serve stale availability, and the app uses no `next/image`).
  `next/font/google` fonts load from CDN at runtime under Workers.
- Compatibility is re-checked with `npx vinext check` (96%, only the font
  note outstanding).
- `SUPABASE_SERVICE_ROLE_KEY` must be provisioned as a **Workers secret**
  (`wrangler secret put SUPABASE_SERVICE_ROLE_KEY`), never as a `vars` entry
  and never with a `NEXT_PUBLIC_` prefix. Public vars (`NEXT_PUBLIC_*`) go
  through the dashboard / `wrangler.jsonc` `vars`.
- Local preview: `build:vinext` picks up `.env.local` into
  `dist/server/.dev.vars` (both git-ignored — secrets never committed).
  This is the vinext/Workers local mechanism; no root `.dev.vars` or extra
  `.env` file is needed, and none should be created.
- `wrangler.jsonc` (root) is authoritative: `dist/server/wrangler.json` is
  regenerated from it on every `build:vinext`. It already carries the
  Cloudflare account ID; `NEXT_PUBLIC_SITE_URL` stays unset until the real
  production domain exists.

## Cloudflare edge checklist (dashboard, after domain is configured)

- DNS + HTTPS/SSL (Full strict) + WAF managed rules + DDoS (unmetered) + Bot Fight Mode.
- Keep `/` public: do NOT put Zero Trust Access in front of the site.
  Staff auth stays Supabase Auth → `/admin`.
- Rate limiting is Workers-native (`ratelimits` bindings in `wrangler.jsonc`,
  enforced in `proxy.ts` for `/login` and in `app/api/ensure-slots/route.ts`
  via server-only `lib/rateLimit.ts`): `LOGIN_RATE_LIMIT` 10 req/60s/IP
  (namespaces `1001`), `ENSURE_SLOTS_RATE_LIMIT` 60 req/60s/IP (`1002`).
  Exceeding callers get HTTP 429 + `Retry-After: 60`. Public reads
  (`/`, slots, `/privacy`, `/terms`, robots, sitemap) are never limited.
  Limits are per Cloudflare location (platform behavior), hence approximate.
  Outside Workers (local dev/tests) the check fails open — abuse protection
  only, never the security boundary (Auth + RLS enforce).
- Do not block verified crawlers (Googlebot etc.) — keep sitemap/robots clean.
- Set `NEXT_PUBLIC_SITE_URL` to the real production domain before deploy;
  preview/staging deployments stay non-indexable via `robots.ts`.

## Deployment to Cloudflare Workers

1. Push the repo to GitHub (no `.env*`, `.dev.vars`, or `dist/` — all ignored)
2. `wrangler login`, then `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
3. Set public vars: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=<real domain>`,
   `NEXT_PUBLIC_BUSINESS_TIMEZONE=Asia/Kolkata`
4. `npm run deploy:vinext`
5. Supabase project already migrated + seeded + first staff created
   (live-verified; see validation checklist).

## Project structure

```text
app/page.tsx (server) + components/PublicDashboard.tsx (client)
app/login/page.tsx app/admin/page.tsx (server) + components/AdminDashboard.tsx (client)
app/layout.tsx app/privacy/page.tsx app/terms/page.tsx app/not-found.tsx
app/robots.ts app/sitemap.ts
app/api/ensure-slots/route.ts   # trusted generation path → RPC
proxy.ts                      # session refresh + /admin guard
vite.config.ts wrangler.jsonc # vinext Cloudflare Workers (non-destructive)
components/TurfSelector.tsx TurfHeader.tsx StatusBanner.tsx DateSelector.tsx
components/SlotGrid.tsx SlotCard.tsx WhatsAppButton.tsx AdminControls.tsx AuthForm.tsx
lib/supabaseClient.ts lib/supabaseServer.ts lib/serverSlots.ts (server-only)
lib/auth.ts lib/slots.ts lib/site.ts
lib/timezone.ts lib/realtime.ts lib/slotsApi.ts lib/cn.ts
types/database.ts
supabase/migrations/ supabase/seed.sql supabase/__tests__/migrations.test.ts
```

## Timezone

Business timezone is `Asia/Kolkata` (`lib/timezone.ts`, `NEXT_PUBLIC_BUSINESS_TIMEZONE`).
Current-status math uses IST wall-clock (`getBusinessDateString` /
`getBusinessMinutes`); display uses `formatTimeDisplay` / `formatSlotRange`.
DB stores native `date`/`time`/`timestamptz` — no browser-local mixing.

## Validation checklist (per-turf)

1. Anonymous opens `/` → sees both turfs, slots, live banner; cannot modify.
2. Anonymous direct `UPDATE slots` → rejected by RLS (no policy).
3. Logged-in non-staff `UPDATE` → rejected by RLS (`is_staff()` false).
4. Staff login → `/admin` works, can update a slot.
5. Staff FREE → BOOKED → row changes + `slot_changes` row + public page updates live.
6. Staff sign-out → `/admin` redirects to `/login`.
7. Now inside a booked slot → banner `BOOKED — Until H:MM PM`.
8. Now outside booked slots → banner `FREE`.
