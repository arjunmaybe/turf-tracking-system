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
    <main className="tt-ambient mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-10">
      <header className="pt-6">
        <p className="tt-eyebrow text-lime-200/80">City Arena · Staff</p>
        <h1 className="tt-display mt-1 text-3xl font-bold text-[#f4efe3]">Staff sign in</h1>
        <p className="mt-1 text-sm text-white/60">
          Authorized turf staff only. Public visitors don&apos;t need an account.
        </p>
      </header>
      <section className="tt-glass rounded-3xl p-4">
        <AuthForm next={next} />
      </section>
      <p className="font-mono text-[10px] leading-relaxed tracking-wider text-white/40">
        ONLY USERS LISTED IN THE <code>staff</code> TABLE CAN USE /admin. DATABASE RLS ENFORCES THIS INDEPENDENTLY OF THE UI.
      </p>
    </main>
  );
}
