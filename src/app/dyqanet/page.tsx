import type { Metadata } from "next";
import Link from "next/link";
import { getStoresPageDataCached } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Dyqanet",
  alternates: { canonical: "/dyqanet" },
};

export default async function StoresPage(props: PageProps<"/dyqanet">) {
  const searchParams = await props.searchParams;
  const city = typeof searchParams.qyteti === "string" ? searchParams.qyteti : "";

  const data = await getStoresPageDataCached();
  const stores = city ? data.stores.filter((s) => s.city === city) : data.stores;
  const { saleCounts, cityCounts } = data;

  // cities with the most points of sale first (Prishtina etc.)
  const cities = cityCounts.map((c) => c.city);

  const offerCountByChain = new Map(saleCounts.map((c) => [c.chainId, c._count._all]));

  // city -> chain -> stores, so each chain appears once per city
  const byCity = new Map<string, Map<string, { chain: (typeof stores)[number]["chain"]; locations: typeof stores }>>();
  for (const cityName of cities) byCity.set(cityName, new Map());
  for (const store of stores) {
    const chains = byCity.get(store.city);
    if (!chains) continue;
    const entry = chains.get(store.chainId) ?? { chain: store.chain, locations: [] };
    entry.locations.push(store);
    chains.set(store.chainId, entry);
  }
  for (const [cityName, chains] of byCity) if (chains.size === 0) byCity.delete(cityName);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Dyqanet</h1>
        <p className="mt-1 text-sm text-ink-soft md:text-base">
          Zgjidh qytetin tënd dhe hap drejtimet në hartë për dyqanin më të afërt.
        </p>
      </section>

      {/* city chips */}
      <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4">
        <Link
          href="/dyqanet"
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
            !city ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/30"
          }`}
        >
          Të gjitha
        </Link>
        {cities.map((c) => {
          const active = city === c;
          return (
            <Link
              key={c}
              href={active ? "/dyqanet" : `/dyqanet?qyteti=${encodeURIComponent(c)}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/30"
              }`}
            >
              📍 {c}
            </Link>
          );
        })}
      </div>

      {stores.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">📍</p>
          <h2 className="mt-3 text-lg font-extrabold">S’ka dyqane në këtë qytet</h2>
          <p className="mt-1 text-sm text-ink-soft">Provo një qytet tjetër.</p>
        </div>
      ) : (
        [...byCity.entries()].map(([cityName, chains]) => (
          <section key={cityName}>
            <h2 className="mb-2.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              {cityName}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...chains.values()].map(({ chain, locations }) => {
                const offers = offerCountByChain.get(chain.id) ?? 0;
                return (
                  <details
                    key={chain.id}
                    className="group rounded-2xl border border-line bg-white open:shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3.5 p-4 [&::-webkit-details-marker]:hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={chain.logoUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl border border-line bg-white object-contain p-1 shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/marketi/${chain.slug}`}
                          className="truncate text-sm font-bold underline-offset-2 hover:text-deal hover:underline"
                        >
                          {chain.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {locations.length === 1 ? "1 lokacion" : `${locations.length} lokacione`} ·{" "}
                          <span className={`font-bold ${offers > 0 ? "text-emerald-600" : "text-deal-dark"}`}>
                            {offers === 1 ? "1 ofertë aktive" : `${offers} oferta aktive`}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 text-ink-soft transition group-open:rotate-180">▾</span>
                    </summary>
                    <ul className="divide-y divide-line border-t border-line">
                      {locations.map((store) => (
                        <li key={store.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{store.name}</p>
                            <p className="truncate text-xs text-ink-soft">{store.address}</p>
                          </div>
                          <a
                            href={store.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-xl border border-line px-3 py-2 text-xs font-bold transition hover:border-ink/40 hover:bg-paper"
                          >
                            Hap në hartë ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
