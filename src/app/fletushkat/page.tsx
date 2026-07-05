import type { Metadata } from "next";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { formatDate, validityLabel } from "@/lib/format";
import { getPublicFliersCached } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Fletushkat e marketeve",
  description:
    "Shfleto fletushkat aktuale të marketeve të Kosovës — Viva Fresh, SPAR, Interex e të tjera — faqe për faqe, si në letër.",
  alternates: { canonical: "/fletushkat" },
};

const NEW_BADGE_MS = 48 * 3_600_000;

export default async function FliersPage() {
  const fliers = await getPublicFliersCached();
  trackEvent("flier_list", { fliers: fliers.length });

  const now = new Date();

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
          Fletushkat e javës
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Fletushkat origjinale të marketeve, faqe për faqe — pa kërkim, pa filtra.
        </p>
      </section>

      {fliers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">📰</p>
          <h2 className="mt-3 text-lg font-extrabold">S’ka fletushka aktive për momentin</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Fletushkat e reja shfaqen këtu sapo t’i publikojnë marketet.
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
          {fliers.map((flier) => {
            const isNew = now.getTime() - flier.createdAt.getTime() < NEW_BADGE_MS;
            return (
              <Link
                key={flier.id}
                href={`/fletushka/${flier.id}`}
                className="group overflow-hidden rounded-3xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-paper">
                  {flier.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={flier.cover}
                      alt={`Fletushka e ${flier.chain.name}`}
                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">📰</div>
                  )}
                  {isNew && (
                    <span className="absolute left-2 top-2 rounded-full bg-deal px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow">
                      E re
                    </span>
                  )}
                  {flier.endsAt && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                      {validityLabel(flier.endsAt, now)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={flier.chain.logoUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-lg border border-line bg-white object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold leading-tight">{flier.chain.name}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {flier.startsAt && flier.endsAt
                        ? `${formatDate(flier.startsAt)} – ${formatDate(flier.endsAt)}`
                        : `${flier.pageCount} faqe`}
                      {flier.activeSales > 0 && ` · ${flier.activeSales} oferta`}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
