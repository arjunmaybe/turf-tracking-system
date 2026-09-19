import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for the turf availability tracking system.",
  alternates: { canonical: `${getSiteUrl()}/privacy` },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 pb-10">
      <header className="pt-4">
        <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
        <p className="text-sm text-zinc-400">
          Turf availability tracking system
        </p>
      </header>
      <section className="flex flex-col gap-3 rounded-2xl bg-zinc-900/60 p-4 text-sm leading-relaxed text-zinc-300 ring-1 ring-zinc-800">
        <p>
          This application is a <strong>turf availability tracking system</strong>.
          It shows which turf slots are free, booked, or under maintenance so
          players can contact the turf manager.
        </p>
        <h2 className="mt-2 text-base font-bold text-white">What we collect</h2>
        <p>
          Public visitors do not need an account and we do not collect personal
          details from them. Tapping WhatsApp or Call opens your own messaging
          or phone app; any message or call is between you and the turf manager.
        </p>
        <p>
          Staff sign-in uses email and password via Supabase Auth so authorized
          staff can update slot availability. Staff updates record which staff
          account changed a slot and when, for audit purposes.
        </p>
        <h2 className="mt-2 text-base font-bold text-white">What we do not do</h2>
        <ul className="list-disc pl-5">
          <li>No online payment is performed in this application.</li>
          <li>No automated booking is performed in this application.</li>
          <li>No payment details are collected.</li>
        </ul>
        <h2 className="mt-2 text-base font-bold text-white">Availability disclaimer</h2>
        <p>
          Availability may change at any time. Actual reservation
          confirmation occurs with the turf manager via WhatsApp or phone — a
          slot shown as free is not a confirmed reservation until the manager
          confirms it.
        </p>
        <h2 className="mt-2 text-base font-bold text-white">Cookies and analytics</h2>
        <p>
          This application does not use advertising trackers. Authentication
          uses strictly necessary session cookies to keep staff signed in.
        </p>
      </section>
      <nav aria-label="Legal">
        <Link href="/" className="text-sm text-emerald-400 underline">
          Back to availability
        </Link>
      </nav>
    </main>
  );
}
