"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Resets FAILED pages to PENDING (processing one) — the page then re-renders with the progress runner. */
export function RetryFailedPagesButton({ flierId }: { flierId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await fetch(`/api/fliers/${flierId}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retryFailed: true }),
    }).catch(() => null);
    router.refresh();
  }

  return (
    <button
      onClick={retry}
      disabled={busy}
      className="rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-ink/85 disabled:opacity-60"
    >
      {busy ? "Duke provuar…" : "Provo përsëri"}
    </button>
  );
}
