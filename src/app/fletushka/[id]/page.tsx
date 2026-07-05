import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlierPagesGallery } from "@/components/FlierPagesGallery";
import { SaleCard } from "@/components/SaleCard";
import { trackEvent } from "@/lib/analytics";
import { formatDate, formatDateFull } from "@/lib/format";
import { getPublicFlierCached } from "@/lib/sales";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(props: PageProps<"/fletushka/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const data = await getPublicFlierCached(id);
  if (!data) return { title: "Fletushka", alternates: { canonical: `/fletushka/${id}` } };

  const title = `Fletushka e ${data.flier.chain.name}`;
  const description = `Shfleto fletushkën aktuale të ${data.flier.chain.name} me ${data.flier.pages.length} faqe${
    data.flier.endsAt ? ` — vlen deri më ${formatDateFull(data.flier.endsAt)}` : ""
  }.`;
  const cover = data.flier.pages[0]?.thumbUrl ?? data.flier.pages[0]?.imageUrl;
  return {
    title,
    description,
    alternates: { canonical: `/fletushka/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(cover ? { images: [absoluteUrl(cover)] } : {}),
    },
  };
}

/** Valid through the whole last day of the flier (or unknown = assume valid). */
function flierStillValid(endsAt: Date | null): boolean {
  if (!endsAt) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endsAt >= today;
}

export default async function PublicFlierPage(props: PageProps<"/fletushka/[id]">) {
  const { id } = await props.params;
  const data = await getPublicFlierCached(id);
  if (!data) notFound();

  const { flier, sales } = data;

  trackEvent("flier_view", { flierId: flier.id, chain: flier.chain.slug });

  return (
    <div className="space-y-5">
      <Link
        href="/fletushkat"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        ← Të gjitha fletushkat
      </Link>

      <section className="flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flier.chain.logoUrl}
          alt=""
          className="h-12 w-12 rounded-2xl border border-line bg-white object-contain p-1 shadow-sm"
        />
        <div className="min-w-0 flex-1 basis-52">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight md:text-2xl">
            Fletushka e {flier.chain.name}
          </h1>
          <p className="text-sm text-ink-soft">
            {flier.startsAt && flier.endsAt
              ? `Vlen prej ${formatDate(flier.startsAt)} deri më ${formatDateFull(flier.endsAt)}`
              : `Publikuar më ${formatDateFull(flier.createdAt)}`}
            {" · "}
            {sales.length === 1 ? "1 ofertë aktive" : `${sales.length} oferta aktive`}
          </p>
        </div>
        {/* full-width row on phones, inline chip on wider screens */}
        <Link
          href={`/marketi/${flier.chain.slug}`}
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-center text-xs font-bold transition hover:border-ink/40 hover:bg-paper sm:w-auto sm:shrink-0"
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
          <FlierPagesGallery pages={flier.pages} />
        </section>
      )}

      {sales.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">🏷️</p>
          <h2 className="mt-3 text-lg font-extrabold">
            {flierStillValid(flier.endsAt)
              ? "Produktet nga kjo fletushkë s’janë futur ende"
              : "S’ka oferta aktive nga kjo fletushkë"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {flierStillValid(flier.endsAt)
              ? "Shfleto faqet origjinale më lart — çmimet janë aty."
              : "Ndoshta kanë skaduar — shiko ofertat aktuale."}
          </p>
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
