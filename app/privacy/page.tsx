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
    <main className="tt-ambient mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 pb-10">
      <header className="pt-4">
        <h1 className="tt-display text-3xl font-bold text-[#f4efe3]">Privacy Policy</h1>
        <p className="text-sm text-white/60">
          Turf availability tracking system
        </p>
      </header>
      <section className="tt-glass flex flex-col gap-3 rounded-3xl p-4 text-sm leading-relaxed text-white/75">
        <p>
          This application is a <strong>turf availability tracking system</strong>.
          It shows which turf slots are free, booked, or under maintenance so
          players can contact the turf manager.
        </p>
        <h2 className="tt-display mt-2 text-lg font-bold text-[#f4efe3]">What we collect</h2>
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
        <h2 className="tt-display mt-2 text-lg font-bold text-[#f4efe3]">What we do not do</h2>
        <ul className="list-disc pl-5">
          <li>No online payment is performed in this application.</li>
          <li>No automated booking is performed in this application.</li>
          <li>No payment details are collected.</li>
        </ul>
        <h2 className="tt-display mt-2 text-lg font-bold text-[#f4efe3]">Availability disclaimer</h2>
        <p>
          Availability may change at any time. Actual reservation
          confirmation occurs with the turf manager via WhatsApp or phone — a
          slot shown as free is not a confirmed reservation until the manager
          confirms it.
        </p>
        <h2 className="tt-display mt-2 text-lg font-bold text-[#f4efe3]">Cookies and analytics</h2>
        <p>
          This application does not use advertising trackers. Authentication
          uses strictly necessary session cookies to keep staff signed in.
        </p>
      </section>
      <nav aria-label="Legal">
        <Link href="/" className="text-sm font-bold text-lime-200 underline">
          Back to availability
        </Link>
      </nav>
    </main>
  );
}
