"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChainResult } from "@/lib/basket";
import { formatPrice } from "@/lib/format";

const PLACEHOLDER = "qumësht 2L\nvezë\ndjathë\nbukë\ndetergjent";

export function ListaCompare() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<ChainResult[] | null>(null);
  const [openChain, setOpenChain] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError("Shkruaj ose ngjit listën — një artikull për rresht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { results: ChainResult[] };
      setResults(data.results);
      setOpenChain(data.results[0]?.chain.id ?? null);
    } catch {
      setError("Diçka shkoi keq — provo prapë.");
    } finally {
      setBusy(false);
    }
  }

  const lineCount = text.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-line bg-white p-4">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          className="w-full resize-y rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed outline-none transition focus:border-deal focus:bg-white"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            {lineCount === 0 ? "Një artikull për rresht" : lineCount === 1 ? "1 artikull" : `${lineCount} artikuj`}
          </p>
          <button
            type="button"
            onClick={compare}
            disabled={busy}
            className="rounded-xl bg-deal px-6 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark disabled:opacity-60"
          >
            {busy ? "Duke krahasuar…" : "Krahaso"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-deal">{error}</p>}
      </div>

      {results !== null && results.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <p className="text-4xl">🛒</p>
          <p className="mt-3 font-bold">Asnjë market s’ka aksion për këta artikuj sot</p>
          <p className="mt-1 text-sm text-ink-soft">Provo emra më të thjeshtë (p.sh. “qumësht” në vend të markës).</p>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => {
            const open = openChain === result.chain.id;
            return (
              <div key={result.chain.id} className="overflow-hidden rounded-3xl border border-line bg-white">
                <button
                  type="button"
                  onClick={() => setOpenChain(open ? null : result.chain.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  {index === 0 && (
                    <span className="rounded-full bg-mint-soft px-2 py-1 text-[11px] font-extrabold uppercase text-mint">
                      Më i miri
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.chain.logoUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl border border-line bg-white object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{result.chain.name}</p>
                    <p className="text-xs text-ink-soft">
                      {result.matched}/{result.items.length} artikuj në aksion
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-deal">{formatPrice(result.totalCents)}</p>
                    <p className="text-[11px] text-ink-soft">{open ? "mbyll ▲" : "detajet ▼"}</p>
                  </div>
                </button>

                {open && (
                  <ul className="divide-y divide-line border-t border-line">
                    {result.items.map((item, itemIndex) => (
                      <li key={`${itemIndex}-${item.raw}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.raw}</span>
                          {item.sale && (
                            <Link
                              href={`/oferta/${item.sale.id}`}
                              className="block truncate text-xs text-ink-soft underline-offset-2 hover:text-deal hover:underline"
                            >
                              {item.sale.productName}
                            </Link>
                          )}
                        </span>
                        {item.sale ? (
                          <span className="shrink-0 text-sm font-extrabold text-deal">
                            {formatPrice(item.sale.newPriceCents)}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs font-semibold text-ink-soft">s’ka aksion</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="px-2 text-xs text-ink-soft">
            Krahasimi përfshin vetëm produktet që janë aktualisht në aksion — jo çmimet e rregullta të
            rafteve. Totali llogaritet vetëm për artikujt e gjetur.
          </p>
        </div>
      )}
    </div>
  );
}
