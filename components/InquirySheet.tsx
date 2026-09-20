"use client";

import { useEffect } from "react";
import type { Slot } from "@/types/database";
import { formatDateLabel, formatSlotRange } from "@/lib/timezone";
import { CloseIcon } from "@/components/icons";
import { WhatsAppButton } from "@/components/WhatsAppButton";

interface Props {
  open: boolean;
  turfName: string;
  slot: Slot | null;
  whatsappUrl: string | null;
  callUrl: string | null;
  onClose: () => void;
  onContactAction: () => void;
}

/**
 * Availability INQUIRY sheet — not a booking form. Collects nothing; it only
 * confirms which turf/date/slot the WhatsApp message will ask about.
 * The manager confirms every reservation externally.
 */
export function InquirySheet({
  open,
  turfName,
  slot,
  whatsappUrl,
  callUrl,
  onClose,
  onContactAction,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !slot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Availability inquiry">
      <button
        aria-label="Close inquiry sheet"
        onClick={onClose}
        className="tt-anim-fade absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div className="tt-glass-deep tt-anim-sheet relative w-full max-w-md rounded-t-3xl p-5 pb-6 sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tt-eyebrow text-lime-200/90">Availability inquiry</p>
            <h2 className="tt-display mt-1 text-2xl font-bold text-[#f4efe3]">
              Ask the manager
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            <dt className="tt-eyebrow text-white/50">Turf</dt>
            <dd className="mt-1 truncate text-xs font-bold text-[#f4efe3]">{turfName}</dd>
          </div>
          <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            <dt className="tt-eyebrow text-white/50">Date</dt>
            <dd className="mt-1 truncate text-xs font-bold text-[#f4efe3]">{formatDateLabel(slot.slot_date)}</dd>
          </div>
          <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            <dt className="tt-eyebrow text-white/50">Slot</dt>
            <dd className="mt-1 truncate text-xs font-bold text-lime-200">
              {formatSlotRange(slot.start_time, slot.end_time)}
            </dd>
          </div>
        </dl>

        <div className="mt-4" onClick={onContactAction}>
          <WhatsAppButton whatsappUrl={whatsappUrl} callUrl={callUrl} />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/50">
          No booking is made in the app and no payment is taken. The message only
          asks about this slot — the manager confirms availability externally.
        </p>
      </div>
    </div>
  );
}
