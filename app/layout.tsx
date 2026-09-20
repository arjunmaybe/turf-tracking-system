import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Turf Slot Tracking — Live Availability",
    template: "%s · Turf Slot Tracking",
  },
  description:
    "Track live turf slot availability. This is an availability tracker, not an online booking or payment system. The manager confirms every reservation externally.",
  openGraph: {
    type: "website",
    siteName: "Turf Slot Tracking",
    title: "Turf Slot Tracking — Live Availability",
    description:
      "Live turf slot availability tracker. No online booking or payment — the manager confirms every reservation.",
  },
  twitter: {
    card: "summary",
    title: "Turf Slot Tracking — Live Availability",
    description:
      "Live turf slot availability tracker. No online booking or payment.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="tt-ambient min-h-full flex flex-col text-[#f4efe3]">
        {children}
        <footer className="mx-auto w-full max-w-xl px-4 pb-24 pt-2">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.18em] text-white/40"
          >
            <span>AVAILABILITY TRACKER — MANAGER CONFIRMS EVERY BOOKING</span>
            <a href="/privacy" className="underline hover:text-white/70 focus-visible:outline-2 focus-visible:outline-lime-300">
              Privacy
            </a>
            <a href="/terms" className="underline hover:text-white/70 focus-visible:outline-2 focus-visible:outline-lime-300">
              Terms
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
