import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms and conditions for using the turf availability tracking system.",
  alternates: { canonical: `${getSiteUrl()}/terms` },
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 pb-10">
      <header className="pt-4">
        <h1 className="text-xl font-bold text-white">Terms and Conditions</h1>
        <p className="text-sm text-zinc-400">
          Turf availability tracking system
        </p>
      </header>
      <section className="flex flex-col gap-3 rounded-2xl bg-zinc-900/60 p-4 text-sm leading-relaxed text-zinc-300 ring-1 ring-zinc-800">
        <p>
          This application is a <strong>turf availability tracking system</strong>,
          not an online booking or payment platform.
        </p>
        <h2 className="mt-2 text-base font-bold text-white">Availability may change</h2>
        <p>
          Availability may change at any time, including due to walk-in bookings,
          maintenance, or manager updates. Always confirm with the turf manager
          before travelling.
        </p>
        <h2 className="mt-2 text-base font-bold text-white">Reservations are confirmed by the manager</h2>
        <p>
          Actual reservation confirmation occurs with the turf manager via
          WhatsApp or phone. Tapping a slot only prepares a message — it does
          not reserve, hold, or book the slot.
        </p>
        <h2 className="mt-2 text-base font-bold text-white">No online payment or automated booking</h2>
        <ul className="list-disc pl-5">
          <li>No online payment is performed through this application.</li>
          <li>No automated booking is performed through this application.</li>
          <li>Any payment or confirmation terms are agreed directly with the turf manager.</li>
        </ul>
        <h2 className="mt-2 text-base font-bold text-white">Acceptable use</h2>
        <p>
          Do not attempt to modify slot data, access staff areas without
          authorization, or abuse the contact buttons. Slot updates are
          restricted to authorized staff and enforced by database access
          controls.
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
