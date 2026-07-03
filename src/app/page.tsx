import Link from "next/link";
import { SaleCard } from "@/components/SaleCard";
import { SearchBar } from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { Category } from "@/generated/prisma/enums";
import type { Metadata } from "next";
import { trackEvent } from "@/lib/analytics";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { getActiveSalesCached, getChainsCached, type SaleSort } from "@/lib/sales";
import { SITE_URL } from "@/lib/site";

// filtered/search variants collapse to the homepage for search engines
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aksione",
  url: `${SITE_URL}/`,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

function isCategory(value: string | undefined): value is Category {
  return value !== undefined && value in Category;
}

function buildQuery(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const chainSlug = typeof searchParams.zinxhiri === "string" ? searchParams.zinxhiri : "";
  const rawCategory = typeof searchParams.kategoria === "string" ? searchParams.kategoria : undefined;
  const category = isCategory(rawCategory) ? rawCategory : undefined;
  const sort: SaleSort =
    searchParams.rendit === "cmimi" || searchParams.rendit === "rejat" ? searchParams.rendit : "zbritja";

  const current = {
    q: q || undefined,
    zinxhiri: chainSlug || undefined,
    kategoria: category,
    rendit: sort === "zbritja" ? undefined : sort,
  };

  const [chains, sales] = await Promise.all([
    getChainsCached(),
    getActiveSalesCached({ q: q || undefined, chainSlug: chainSlug || undefined, category, sort }),
  ]);

  const hasFilters = Boolean(q || chainSlug || category);

  if (q) trackEvent("search", { q: q.toLowerCase().slice(0, 60), results: sales.length });
  else if (chainSlug || category || sort !== "zbritja") {
    trackEvent("filter_use", { chain: chainSlug || "", category: category ?? "", sort });
  }

  return (
    <div className="space-y-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
      />
      <section className="rounded-3xl bg-ink px-5 py-7 text-white md:px-8 md:py-9">
        <h1 className="max-w-xl text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
          Aksionet e marketeve të Kosovës, <span className="text-red-400">në një vend</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/70 md:text-base">
          Krahaso ofertat aktuale të marketeve kryesore të Kosovës dhe kurse në çdo blerje.
        </p>
        <div className="mt-5 max-w-xl">
          <SearchBar
            defaultValue={q}
            hidden={{
              ...(chainSlug ? { zinxhiri: chainSlug } : {}),
              ...(category ? { kategoria: category } : {}),
            }}
          />
        </div>
      </section>

      {/* chain chips */}
      <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4">
        <Link
          href={buildQuery(current, { zinxhiri: undefined })}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
            !chainSlug ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/30"
          }`}
        >
          Të gjitha
        </Link>
        {chains.map((chain) => {
          const active = chainSlug === chain.slug;
          return (
            <Link
              key={chain.id}
              href={buildQuery(current, { zinxhiri: active ? undefined : chain.slug })}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-bold transition ${
                active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chain.logoUrl} alt="" className="h-6 w-6 rounded-md bg-white object-contain p-px" />
              {chain.name}
            </Link>
          );
        })}
      </div>

      {/* category chips */}
      <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4">
        {CATEGORY_ORDER.map((key) => {
          const meta = CATEGORY_META[key];
          const active = category === key;
          return (
            <Link
              key={key}
              href={buildQuery(current, { kategoria: active ? undefined : key })}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                active ? "border-deal bg-deal-soft text-deal-dark" : "border-line bg-white text-ink-soft hover:border-ink/30"
              }`}
            >
              {meta.emoji} {meta.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-soft">
          {sales.length === 1 ? "1 ofertë aktive" : `${sales.length} oferta aktive`}
          {q && (
            <>
              {" "}
              për <span className="text-ink">“{q}”</span>
            </>
          )}
        </p>
        <SortSelect current={sort} />
      </div>

      {sales.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">🛒</p>
          <h2 className="mt-3 text-lg font-extrabold">S’u gjet asnjë ofertë</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            {hasFilters
              ? "Provo një kërkim tjetër ose hiqi filtrat — ofertat ndryshojnë çdo ditë."
              : "Ende s’ka oferta aktive. Kthehu më vonë!"}
          </p>
          {hasFilters && (
            <Link
              href="/"
              className="mt-5 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/85"
            >
              Pastro filtrat
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}
    </div>
  );
}
