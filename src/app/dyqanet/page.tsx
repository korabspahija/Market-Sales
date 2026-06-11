import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { activeSaleWhere } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Dyqanet",
};

export default async function StoresPage(props: PageProps<"/dyqanet">) {
  const searchParams = await props.searchParams;
  const city = typeof searchParams.qyteti === "string" ? searchParams.qyteti : "";

  const [stores, saleCounts] = await Promise.all([
    prisma.store.findMany({
      where: city ? { city } : undefined,
      include: { chain: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.sale.groupBy({
      by: ["chainId"],
      where: activeSaleWhere(),
      _count: { _all: true },
    }),
  ]);

  const cities = (
    await prisma.store.findMany({ select: { city: true }, distinct: ["city"], orderBy: { city: "asc" } })
  ).map((s) => s.city);

  const countByChain = new Map(saleCounts.map((c) => [c.chainId, c._count._all]));

  const byCity = new Map<string, typeof stores>();
  for (const store of stores) {
    const list = byCity.get(store.city) ?? [];
    list.push(store);
    byCity.set(store.city, list);
  }

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
        [...byCity.entries()].map(([cityName, cityStores]) => (
          <section key={cityName}>
            <h2 className="mb-2.5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              {cityName}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cityStores.map((store) => {
                const count = countByChain.get(store.chainId) ?? 0;
                return (
                  <div
                    key={store.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={store.chain.logoUrl} alt={store.chain.name} className="h-11 w-11 rounded-xl shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{store.name}</p>
                      <p className="truncate text-xs text-ink-soft">{store.address}</p>
                      <Link
                        href={`/?zinxhiri=${store.chain.slug}`}
                        className="mt-1 inline-block rounded-md bg-deal-soft px-1.5 py-0.5 text-[11px] font-bold text-deal-dark transition hover:bg-deal/15"
                      >
                        {count === 1 ? "1 ofertë aktive" : `${count} oferta aktive`}
                      </Link>
                    </div>
                    <a
                      href={store.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl border border-line px-3 py-2 text-xs font-bold transition hover:border-ink/40 hover:bg-paper"
                    >
                      Hap në hartë ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
