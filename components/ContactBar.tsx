"use client";

import { ArrowUpIcon, WhatsAppGlyph } from "@/components/icons";

interface Props {
  whatsappUrl: string | null;
  onWhatsApp: () => void;
}

/** Sticky bottom action area: WhatsApp inquiry CTA + scroll-to-top. */
export function ContactBar({ whatsappUrl, onWhatsApp }: Props) {
  const scrollTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="sticky bottom-0 z-40 -mx-4 border-t border-white/10 bg-[#060b16]/85 px-4 pb-4 pt-3 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center gap-2">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onWhatsApp}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-black text-lime-950 shadow-[0_8px_30px_rgba(163,230,53,0.25)] transition active:scale-[0.98] hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
          >
            <WhatsAppGlyph className="h-5 w-5" />
            WhatsApp Manager
          </a>
        ) : (
          <button
            disabled
            title="WhatsApp number not configured"
            className="min-h-12 flex-1 cursor-not-allowed rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-white/40 ring-1 ring-white/10"
          >
            WhatsApp Unavailable
          </button>
        )}
        <button
          onClick={scrollTop}
          aria-label="Scroll to top"
          className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-white/5 text-white/70 ring-1 ring-white/10 transition active:scale-[0.98] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
        >
          <ArrowUpIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
