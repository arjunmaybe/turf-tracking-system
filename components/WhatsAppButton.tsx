import { PhoneIcon, WhatsAppGlyph } from "@/components/icons";

interface Props {
  whatsappUrl: string | null;
  callUrl: string | null;
  disabledReason?: string | null;
}

/** Contact actions. Booking itself is confirmed externally by the manager. */
export function WhatsAppButton({ whatsappUrl, callUrl, disabledReason }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-black text-lime-950 shadow-[0_8px_30px_rgba(163,230,53,0.25)] transition active:scale-[0.98] hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
        >
          <WhatsAppGlyph className="h-5 w-5" />
          WhatsApp Manager
        </a>
      ) : (
        <button
          disabled
          title={disabledReason ?? "WhatsApp number not configured"}
          className="min-h-12 cursor-not-allowed rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-white/40 ring-1 ring-white/10"
        >
          WhatsApp Unavailable
        </button>
      )}
      {callUrl ? (
        <a
          href={callUrl}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/8 px-4 py-3 text-sm font-black text-[#f4efe3] ring-1 ring-white/15 transition active:scale-[0.98] hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <PhoneIcon className="h-5 w-5" />
          Call Manager
        </a>
      ) : (
        <button
          disabled
          title={disabledReason ?? "Phone number not configured"}
          className="min-h-12 cursor-not-allowed rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-white/40 ring-1 ring-white/10"
        >
          Call Unavailable
        </button>
      )}
    </div>
  );
}
