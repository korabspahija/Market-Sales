"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });

    if (res.ok) {
      router.push(returnTo.startsWith("/") ? returnTo : "/menaxho");
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error ?? "Diçka shkoi keq. Provo përsëri.");
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
          Email-i
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="emri@kompania.com"
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-deal focus:bg-white focus:ring-2 focus:ring-deal/15"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
          Fjalëkalimi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-deal focus:bg-white focus:ring-2 focus:ring-deal/15"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-deal-soft px-3.5 py-2.5 text-sm font-medium text-deal-dark">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-deal py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Duke u identifikuar…" : "Hyr"}
      </button>
    </form>
  );
}
