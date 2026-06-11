"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteSaleButton({ saleId, productName }: { saleId: string; productName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Ta fshijmë ofertën “${productName}”? Ky veprim s’kthehet.`)) return;
    setBusy(true);
    const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? "Fshirja dështoi. Provo përsëri.");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="rounded-lg border border-deal/30 px-3 py-1.5 text-xs font-bold text-deal transition hover:bg-deal-soft disabled:opacity-60"
    >
      {busy ? "…" : "Fshij"}
    </button>
  );
}
