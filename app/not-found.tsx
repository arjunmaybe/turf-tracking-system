import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-10 pt-10 text-center">
      <p className="text-5xl" aria-hidden>
        ⚽
      </p>
      <h1 className="text-xl font-bold text-white">Page not found</h1>
      <p className="text-sm text-zinc-400">
        This page does not exist. Check live turf availability instead — the
        manager confirms every reservation externally.
      </p>
      <Link
        href="/"
        className="min-h-12 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
      >
        Back to availability
      </Link>
    </main>
  );
}
