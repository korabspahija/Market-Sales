import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteFlierButton } from "@/components/DeleteFlierButton";
import { prisma } from "@/lib/db";
import { formatDateFull } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Fletushkat",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PROCESSING: { label: "Duke u lexuar", className: "bg-amber-soft text-amber-tag" },
  REVIEW: { label: "Pret verifikim", className: "bg-deal-soft text-deal-dark" },
  PUBLISHED: { label: "E publikuar", className: "bg-mint-soft text-mint" },
  FAILED: { label: "Dështoi", className: "bg-paper text-ink-soft" },
};

export default async function FliersPage() {
  const session = await getSession();
  if (!session) redirect("/hyr");

  const fliers = await prisma.flier.findMany({
    where: { chainId: session.chainId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pages: true, drafts: true, sales: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/menaxho"
            className="text-sm font-semibold text-ink-soft transition hover:text-ink"
          >
            ← Paneli
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Fletushkat</h1>
          <p className="text-sm text-ink-soft">
            Ngarko fletushkën — Aksione i lexon artikujt, ti vetëm i verifikon.
          </p>
        </div>
        <Link
          href="/menaxho/fletushkat/ngarko"
          className="rounded-xl bg-deal px-4 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark"
        >
          + Ngarko fletushkë
        </Link>
      </div>

      {fliers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">📄</p>
          <p className="mt-3 font-bold">Ende s’ke ngarkuar asnjë fletushkë</p>
          <p className="mt-1 text-sm text-ink-soft">
            Fotografo ose shkarko faqet e fletushkës dhe ngarkoji — pjesën tjetër e bën Aksione.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {fliers.map((flier) => {
            const badge = STATUS_BADGE[flier.status];
            return (
              <li
                key={flier.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">Fletushka e {formatDateFull(flier.createdAt)}</p>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {flier._count.pages} faqe · {flier._count.drafts} artikuj në pritje ·{" "}
                    {flier._count.sales} të publikuar
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/menaxho/fletushkat/${flier.id}`}
                    className="rounded-lg bg-ink px-3.5 py-2 text-xs font-bold text-white transition hover:bg-ink/85"
                  >
                    {flier.status === "REVIEW" ? "Verifiko" : "Hape"}
                  </Link>
                  <DeleteFlierButton flierId={flier.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
