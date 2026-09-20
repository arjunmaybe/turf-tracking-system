import Link from "next/link";

export default function NotFound() {
  return (
    <main className="tt-ambient mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-10 pt-10 text-center">
      <p className="text-5xl" aria-hidden>
        ⚽
      </p>
      <h1 className="tt-display text-3xl font-bold text-[#f4efe3]">Page not found</h1>
      <p className="text-sm text-white/60">
        This page does not exist. Check live turf availability instead — the
        manager confirms every reservation externally.
      </p>
      <Link
        href="/"
        className="min-h-12 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-black text-lime-950 transition active:scale-[0.99] hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
      >
        Back to availability
      </Link>
    </main>
  );
}
