import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SaleForm } from "@/components/SaleForm";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ndrysho ofertën",
};

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function EditSalePage(props: PageProps<"/menaxho/[id]/ndrysho">) {
  const session = await getSession();
  if (!session) redirect("/hyr");

  const { id } = await props.params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  // a manager can only ever touch their own chain's sales
  if (!sale || sale.chainId !== session.chainId) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href="/menaxho"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        ← Paneli
      </Link>
      <div className="rounded-3xl border border-line bg-white p-5 md:p-7">
        <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">Ndrysho ofertën</h1>
        <p className="mt-1 text-sm text-ink-soft">{sale.productName}</p>
        <div className="mt-6">
          <SaleForm
            mode="edit"
            saleId={sale.id}
            flierPageUrl={sale.flierPageUrl}
            defaults={{
              productName: sale.productName,
              category: sale.category,
              sizeValue: sale.sizeValue,
              sizeUnit: sale.sizeUnit,
              oldPrice: (sale.oldPriceCents / 100).toFixed(2),
              newPrice: (sale.newPriceCents / 100).toFixed(2),
              startDate: toDateInput(sale.startsAt),
              endDate: toDateInput(sale.endsAt),
              imageUrl: sale.imageUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
