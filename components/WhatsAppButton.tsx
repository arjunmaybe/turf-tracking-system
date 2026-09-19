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
          className="flex min-h-12 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          WhatsApp Manager
        </a>
      ) : (
        <button
          disabled
          title={disabledReason ?? "WhatsApp number not configured"}
          className="min-h-12 cursor-not-allowed rounded-2xl bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-500"
        >
          WhatsApp Unavailable
        </button>
      )}
      {callUrl ? (
        <a
          href={callUrl}
          className="flex min-h-12 items-center justify-center rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Call Manager
        </a>
      ) : (
        <button
          disabled
          title={disabledReason ?? "Phone number not configured"}
          className="min-h-12 cursor-not-allowed rounded-2xl bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-500"
        >
          Call Unavailable
        </button>
      )}
    </div>
  );
}
