import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlierPagesGallery } from "@/components/FlierPagesGallery";
import { SaleCard } from "@/components/SaleCard";
import { trackEvent } from "@/lib/analytics";
import { formatDateFull } from "@/lib/format";
import { getChainPageCached } from "@/lib/sales";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(props: PageProps<"/marketi/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getChainPageCached(slug);
  if (!data) return { title: "Marketi" };

  const title = `Fletushka dhe ofertat e ${data.chain.name}`;
  const description = `${data.sales.length} oferta aktive nga ${data.chain.name} në Kosovë${
    data.flier?.endsAt ? ` — vlejnë deri më ${formatDateFull(data.flier.endsAt)}` : ""
  }. Shiko fletushkën aktuale, çmimet me zbritje dhe ${data.stores.length} dyqanet.`;
  return {
    title,
    description,
    alternates: { canonical: `/marketi/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function ChainPage(props: PageProps<"/marketi/[slug]">) {
  const { slug } = await props.params;
  const data = await getChainPageCached(slug);
  if (!data) notFound();

  const { chain, sales, stores, flier } = data;
  trackEvent("chain_page", { chain: chain.slug });

  const cities = [...new Set(stores.map((s) => s.city))];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: chain.name,
    logo: absoluteUrl(chain.logoUrl),
    url: absoluteUrl(`/marketi/${chain.slug}`),
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={chain.logoUrl}
          alt={chain.name}
          className="h-16 w-16 rounded-2xl border border-line bg-white object-contain p-1.5 shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
            {chain.name}
          </h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {sales.length === 1 ? "1 ofertë aktive" : `${sales.length} oferta aktive`} ·{" "}
            {stores.length === 1 ? "1 dyqan" : `${stores.length} dyqane`}
            {cities.length > 0 && ` në ${cities.slice(0, 4).join(", ")}${cities.length > 4 ? "…" : ""}`}
          </p>
        </div>
      </section>

      {flier && (
        <section className="rounded-3xl border border-line bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Fletushka aktuale</h2>
              {flier.startsAt && flier.endsAt && (
                <p className="text-sm text-ink-soft">
                  Vlen prej {formatDateFull(flier.startsAt)} deri më {formatDateFull(flier.endsAt)}
                </p>
              )}
            </div>
            <Link
              href={`/fletushka/${flier.id}`}
              className="rounded-xl border border-line px-3.5 py-2 text-xs font-bold transition hover:border-ink/40 hover:bg-paper"
            >
              Hape fletushkën →
            </Link>
          </div>
          <FlierPagesGallery pages={flier.pages} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">
          Ofertat aktive nga {chain.name}
        </h2>
        {sales.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
            <p className="text-4xl">🏷️</p>
            <p className="mt-3 font-bold">S’ka oferta aktive për momentin</p>
            <p className="mt-1 text-sm text-ink-soft">Kthehu së shpejti — ofertat ndryshojnë çdo javë.</p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-xl bg-deal px-5 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark"
            >
              Shiko marketet tjera
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sales.map((sale) => (
              <SaleCard key={sale.id} sale={sale} />
            ))}
          </div>
        )}
      </section>

      {stores.length > 0 && (
        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-extrabold tracking-tight">Dyqanet e {chain.name}</h2>
          <ul className="mt-3 divide-y divide-line">
            {stores.map((store) => (
              <li key={store.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{store.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {store.address}, {store.city}
                  </p>
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
        </section>
      )}
    </div>
  );
}
