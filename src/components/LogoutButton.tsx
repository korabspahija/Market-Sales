"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={busy}
      className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-soft transition hover:border-ink/40 hover:text-ink disabled:opacity-60"
    >
      Dil
    </button>
  );
}
