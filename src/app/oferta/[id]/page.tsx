import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_META } from "@/lib/categories";
import { prisma } from "@/lib/db";
import {
  discountPercent,
  formatDateFull,
  formatPrice,
  formatSize,
  formatUnitPrice,
  validityLabel,
} from "@/lib/format";
import { getVisibleSale, isSaleActive } from "@/lib/sales";
import { getSession } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/oferta/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const sale = await prisma.sale.findUnique({ where: { id }, select: { productName: true } });
  return { title: sale?.productName ?? "Oferta" };
}

export default async function SaleDetailPage(props: PageProps<"/oferta/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  const sale = await getVisibleSale(id, session?.chainId);
  if (!sale) notFound();

  const percent = discountPercent(sale.oldPriceCents, sale.newPriceCents);
  const saved = sale.oldPriceCents - sale.newPriceCents;
  const meta = CATEGORY_META[sale.category];
  const active = isSaleActive(sale);

  const stores = await prisma.store.findMany({
    where: { chainId: sale.chainId },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        ← Kthehu te ofertat
      </Link>

      {!active && (
        <p className="rounded-2xl bg-amber-soft px-4 py-3 text-sm font-semibold text-amber-tag">
          Kjo ofertë nuk është aktive për blerësit — po e sheh si menaxher i {sale.chain.name}.
        </p>
      )}

      <div className="overflow-hidden rounded-3xl border border-line bg-white md:grid md:grid-cols-2">
        <div className="relative aspect-square bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sale.imageUrl} alt={sale.productName} className="h-full w-full object-contain p-4" />
          <span className="absolute left-4 top-4 rounded-xl bg-deal px-3 py-1.5 text-xl font-extrabold leading-none text-white shadow">
            -{percent}%
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5 md:p-7">
          <Link
            href={`/?zinxhiri=${sale.chain.slug}`}
            className="group flex items-center gap-2.5 rounded-2xl border border-line p-2 pr-3 transition hover:border-ink/30 hover:bg-paper"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sale.chain.logoUrl} alt="" className="h-10 w-10 rounded-xl border border-line bg-white object-contain p-0.5 shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">{sale.chain.name}</p>
              <p className="text-xs text-ink-soft">Shiko të gjitha ofertat e këtij marketi</p>
            </div>
            <span className="text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-ink">→</span>
          </Link>

          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">
              {sale.productName}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {formatSize(sale.sizeValue, sale.sizeUnit)} · {meta.emoji} {meta.label}
            </p>
          </div>

          <div className="rounded-2xl bg-paper p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-deal">
                {formatPrice(sale.newPriceCents)}
              </span>
              <span className="price-old text-lg font-semibold text-ink-soft">
                {formatPrice(sale.oldPriceCents)}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-lg bg-mint-soft px-2 py-1 text-mint">
                Kursen {formatPrice(saved)}
              </span>
              <span className="rounded-lg bg-white px-2 py-1 text-ink-soft">
                {formatUnitPrice(sale.newPriceCents, sale.sizeValue, sale.sizeUnit)}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-tag">{active ? validityLabel(sale.endsAt) : null}</p>
            <p className="text-ink-soft">
              Vlen prej {formatDateFull(sale.startsAt)} deri më {formatDateFull(sale.endsAt)}.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-line bg-white p-5 md:p-6">
        <h2 className="text-lg font-extrabold tracking-tight">Ku e gjen</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Oferta vlen në dyqanet e {sale.chain.name}:
        </p>
        <ul className="mt-4 divide-y divide-line">
          {stores.map((store) => (
            <li key={store.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-bold">{store.name}</p>
                <p className="text-xs text-ink-soft">
                  {store.address}, {store.city}
                </p>
              </div>
              <a
                href={store.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink transition hover:border-ink/40 hover:bg-paper"
              >
                Hap në hartë ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
