"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export function AuthForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(
          signInError.message.includes("Invalid login")
            ? "Invalid email or password."
            : `Sign in failed: ${signInError.message}`,
        );
        return;
      }
      window.location.href = next || "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" aria-label="Staff sign in">
      <label className="flex flex-col gap-1.5 text-sm font-bold text-white/80">
        Email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-2xl bg-black/30 px-4 py-3 text-[#f4efe3] ring-1 ring-white/15 placeholder:text-white/30 focus:outline-2 focus:outline-lime-300"
          placeholder="staff@example.com"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-white/80">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 rounded-2xl bg-black/30 px-4 py-3 text-[#f4efe3] ring-1 ring-white/15 placeholder:text-white/30 focus:outline-2 focus:outline-lime-300"
          placeholder="••••••••"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/30">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="min-h-12 rounded-2xl bg-lime-300 px-4 py-3 text-sm font-black text-lime-950 shadow-[0_8px_30px_rgba(163,230,53,0.25)] transition active:scale-[0.99] hover:bg-lime-200 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
