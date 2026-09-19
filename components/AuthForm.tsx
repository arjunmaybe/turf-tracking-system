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
      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-300">
        Email
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-xl bg-zinc-900 px-4 py-3 text-white ring-1 ring-zinc-700 placeholder:text-zinc-500 focus:outline-2 focus:outline-emerald-400"
          placeholder="staff@example.com"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-300">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 rounded-xl bg-zinc-900 px-4 py-3 text-white ring-1 ring-zinc-700 placeholder:text-zinc-500 focus:outline-2 focus:outline-emerald-400"
          placeholder="••••••••"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-red-500/15 p-3 text-sm text-red-300 ring-1 ring-red-500/40">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="min-h-12 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
