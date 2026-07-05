"use client";

import { useEffect, useRef, useState } from "react";
import type { SaleWithChain } from "@/lib/sales";
import { SaleCard } from "./SaleCard";

type Filters = { q?: string; zinxhiri?: string; kategoria?: string; rendit?: string };

/** JSON dates -> real Dates so SaleCard's validity label works. */
function revive(sale: SaleWithChain): SaleWithChain {
  return {
    ...sale,
    startsAt: new Date(sale.startsAt),
    endsAt: new Date(sale.endsAt),
    createdAt: new Date(sale.createdAt),
    updatedAt: new Date(sale.updatedAt),
  };
}

/**
 * Infinite scroll under the server-rendered first page: when the sentinel
 * nears the viewport, the next slice is fetched from /api/sales and appended.
 */
export function LoadMoreSales({
  filters,
  initialLoaded,
  total,
}: {
  filters: Filters;
  initialLoaded: number;
  total: number;
}) {
  const [extra, setExtra] = useState<SaleWithChain[]>([]);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loaded = initialLoaded + extra.length;
  const hasMore = loaded < total;

  useEffect(() => {
    if (!hasMore || failed) return;
    const el = sentinel.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || busy.current) return;
        busy.current = true;
        try {
          const params = new URLSearchParams();
          if (filters.q) params.set("q", filters.q);
          if (filters.zinxhiri) params.set("zinxhiri", filters.zinxhiri);
          if (filters.kategoria) params.set("kategoria", filters.kategoria);
          if (filters.rendit) params.set("rendit", filters.rendit);
          params.set("nga", String(loaded));

          const res = await fetch(`/api/sales?${params.toString()}`);
          if (!res.ok) throw new Error(`${res.status}`);
          const data = (await res.json()) as { sales: SaleWithChain[] };
          setExtra((prev) => [...prev, ...data.sales.map(revive)]);
        } catch {
          setFailed(true);
        } finally {
          busy.current = false;
        }
      },
      // start loading well before the user reaches the bottom
      { rootMargin: "700px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded, hasMore, failed, filters.q, filters.zinxhiri, filters.kategoria, filters.rendit]);

  return (
    <>
      {extra.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {extra.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}
      {hasMore && !failed && (
        <div ref={sentinel} className="flex justify-center py-8" aria-label="Duke ngarkuar oferta tjera">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-deal" />
        </div>
      )}
      {failed && (
        <p className="py-6 text-center text-sm text-ink-soft">
          S’u ngarkuan dot ofertat tjera —{" "}
          <button
            type="button"
            onClick={() => setFailed(false)}
            className="font-bold text-deal underline-offset-2 hover:underline"
          >
            provo prapë
          </button>
        </p>
      )}
    </>
  );
}
