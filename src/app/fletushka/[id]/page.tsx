import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SaleCard } from "@/components/SaleCard";
import { formatDateFull } from "@/lib/format";
import { getPublicFlierCached } from "@/lib/sales";

export async function generateMetadata(props: PageProps<"/fletushka/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const data = await getPublicFlierCached(id);
  return { title: data ? `Fletushka e ${data.flier.chain.name}` : "Fletushka" };
}

export default async function PublicFlierPage(props: PageProps<"/fletushka/[id]">) {
  const { id } = await props.params;
  const data = await getPublicFlierCached(id);
  if (!data) notFound();

  const { flier, sales } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        ← Kthehu te ofertat
      </Link>

      <section className="flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flier.chain.logoUrl}
          alt=""
          className="h-12 w-12 rounded-2xl border border-line bg-white object-contain p-1 shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight md:text-2xl">
            Fletushka e {flier.chain.name}
          </h1>
          <p className="text-sm text-ink-soft">
            {flier.startsAt && flier.endsAt
              ? `Vlen prej ${formatDateFull(flier.startsAt)} deri më ${formatDateFull(flier.endsAt)}`
              : `Publikuar më ${formatDateFull(flier.createdAt)}`}
            {" · "}
            {sales.length === 1 ? "1 ofertë aktive" : `${sales.length} oferta aktive`}
          </p>
        </div>
        <Link
          href={`/?zinxhiri=${flier.chain.slug}`}
          className="shrink-0 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold transition hover:border-ink/40 hover:bg-paper"
        >
          Të gjitha ofertat e {flier.chain.name} →
        </Link>
      </section>

      {/* the original flier pages — proof for the skeptical shopper */}
      {flier.pages.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            Fletushka origjinale
          </h2>
          <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4">
            {flier.pages.map((page) => (
              <a key={page.id} href={page.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.imageUrl}
                  alt={`Faqja ${page.pageNo}`}
                  className="h-36 w-26 rounded-xl border border-line object-cover transition hover:opacity-90"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {sales.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">🏷️</p>
          <h2 className="mt-3 text-lg font-extrabold">S’ka oferta aktive nga kjo fletushkë</h2>
          <p className="mt-1 text-sm text-ink-soft">Ndoshta kanë skaduar — shiko ofertat aktuale.</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-deal px-5 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark"
          >
            Shiko ofertat
          </Link>
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
