import Link from "next/link";
import {
  discountPercent,
  formatPrice,
  formatSize,
  formatUnitPrice,
  validityLabel,
} from "@/lib/format";
import type { SaleWithChain } from "@/lib/sales";

export function SaleCard({ sale }: { sale: SaleWithChain }) {
  const percent = discountPercent(sale.oldPriceCents, sale.newPriceCents);
  const saved = sale.oldPriceCents - sale.newPriceCents;

  return (
    <Link
      href={`/oferta/${sale.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/5"
    >
      <div className="relative aspect-square overflow-hidden bg-paper">
        {/* SVG seed images & small uploads — plain img keeps it simple and mobile-portable */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sale.imageUrl}
          alt={sale.productName}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute left-2 top-2 rounded-lg bg-deal px-2 py-1 text-sm font-extrabold leading-none text-white shadow-sm">
          -{percent}%
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sale.chain.logoUrl}
          alt={sale.chain.name}
          title={sale.chain.name}
          className="absolute right-2 top-2 h-8 w-8 rounded-lg shadow-sm ring-2 ring-white"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-bold leading-snug">{sale.productName}</p>
        <p className="text-xs text-ink-soft">
          {formatSize(sale.sizeValue, sale.sizeUnit)} ·{" "}
          {formatUnitPrice(sale.newPriceCents, sale.sizeValue, sale.sizeUnit)}
        </p>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-tight text-deal">
            {formatPrice(sale.newPriceCents)}
          </span>
          <span className="price-old text-sm font-medium text-ink-soft">
            {formatPrice(sale.oldPriceCents)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="rounded-md bg-mint-soft px-1.5 py-0.5 text-[11px] font-bold text-mint">
            Kursen {formatPrice(saved)}
          </span>
          <span className="text-[11px] font-semibold text-amber-tag">
            {validityLabel(sale.endsAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
