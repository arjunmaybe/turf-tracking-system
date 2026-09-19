import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Staff Sign In",
  description: "Sign in for authorized turf staff.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/admin";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-10">
      <header className="pt-6">
        <h1 className="text-xl font-bold text-white">Staff sign in</h1>
        <p className="text-sm text-zinc-400">
          Authorized turf staff only. Public visitors don&apos;t need an account.
        </p>
      </header>
      <section className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
        <AuthForm next={next} />
      </section>
      <p className="text-xs text-zinc-500">
        Only users listed in the <code>staff</code> table can use /admin. Database RLS enforces this independently of the UI.
      </p>
    </main>
  );
}
