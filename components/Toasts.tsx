import { CheckIcon } from "@/components/icons";

export interface ToastItem {
  id: number;
  message: string;
}

/** Polished toast feedback for selection-type interactions. Never booking copy. */
export function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="tt-glass-deep tt-anim-toast flex items-center gap-2 rounded-full py-2.5 pl-3.5 pr-5 text-xs font-semibold text-[#f4efe3] shadow-2xl"
        >
          <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-300 text-lime-950">
            <CheckIcon className="h-3 w-3" />
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
