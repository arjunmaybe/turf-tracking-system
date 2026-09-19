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
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
        <footer className="mx-auto w-full max-w-xl px-4 pb-6 pt-2">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500"
          >
            <span>Availability tracker — manager confirms every booking.</span>
            <a href="/privacy" className="underline hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-emerald-400">
              Privacy
            </a>
            <a href="/terms" className="underline hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-emerald-400">
              Terms
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
