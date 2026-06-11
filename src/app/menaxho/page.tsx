import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteSaleButton } from "@/components/DeleteSaleButton";
import { LogoutButton } from "@/components/LogoutButton";
import { prisma } from "@/lib/db";
import { formatDate, formatPrice, formatSize } from "@/lib/format";
import { saleStatus, type SaleStatus } from "@/lib/sales";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Paneli i menaxherit",
};

const STATUS_BADGE: Record<SaleStatus, { label: string; className: string }> = {
  aktive: { label: "Aktive", className: "bg-mint-soft text-mint" },
  "se-shpejti": { label: "Së shpejti", className: "bg-amber-soft text-amber-tag" },
  skaduar: { label: "Skaduar", className: "bg-paper text-ink-soft" },
};

export default async function ManagerDashboard() {
  const session = await getSession();
  if (!session) redirect("/hyr");

  const [chain, sales] = await Promise.all([
    prisma.chain.findUnique({ where: { id: session.chainId } }),
    prisma.sale.findMany({
      where: { chainId: session.chainId },
      orderBy: { endsAt: "desc" },
    }),
  ]);
  if (!chain) redirect("/hyr");

  const now = new Date();
  const counts = { aktive: 0, "se-shpejti": 0, skaduar: 0 };
  for (const sale of sales) counts[saleStatus(sale, now)]++;

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chain.logoUrl} alt="" className="h-12 w-12 rounded-2xl shadow-sm" />
          <div>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight md:text-2xl">
              {chain.name}
            </h1>
            <p className="text-sm text-ink-soft">Përshëndetje, {session.name}!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/menaxho/krijo"
            className="rounded-xl bg-deal px-4 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark"
          >
            + Shto ofertë
          </Link>
          <LogoutButton />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-2xl font-extrabold text-mint">{counts.aktive}</p>
          <p className="text-xs font-semibold text-ink-soft">Aktive</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-2xl font-extrabold text-amber-tag">{counts["se-shpejti"]}</p>
          <p className="text-xs font-semibold text-ink-soft">Së shpejti</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-2xl font-extrabold text-ink-soft">{counts.skaduar}</p>
          <p className="text-xs font-semibold text-ink-soft">Të skaduara</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-extrabold tracking-tight">Ofertat e {chain.name}</h2>
          <p className="text-xs text-ink-soft">
            Blerësit shohin vetëm ofertat aktive — të skaduarat dhe të ardhshmet i sheh vetëm ti.
          </p>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-4xl">🏷️</p>
            <p className="mt-3 font-bold">Ende s’ke asnjë ofertë</p>
            <p className="mt-1 text-sm text-ink-soft">Shto të parën dhe shfaqu te blerësit.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sales.map((sale) => {
              const badge = STATUS_BADGE[saleStatus(sale, now)];
              return (
                <li key={sale.id} className="flex items-center gap-3.5 px-4 py-3.5 md:px-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sale.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold">{sale.productName}</p>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatSize(sale.sizeValue, sale.sizeUnit)} ·{" "}
                      <span className="price-old">{formatPrice(sale.oldPriceCents)}</span>{" "}
                      <span className="font-bold text-deal">{formatPrice(sale.newPriceCents)}</span>{" "}
                      · {formatDate(sale.startsAt)} – {formatDate(sale.endsAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/menaxho/${sale.id}/ndrysho`}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-ink/40 hover:bg-paper"
                    >
                      Ndrysho
                    </Link>
                    <DeleteSaleButton saleId={sale.id} productName={sale.productName} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
