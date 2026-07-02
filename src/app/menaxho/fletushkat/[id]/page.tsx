import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlierProcessRunner } from "@/components/FlierProcessRunner";
import { FlierReviewTable, type ReviewRow } from "@/components/FlierReviewTable";
import { RetryFailedPagesButton } from "@/components/RetryFailedPagesButton";
import { prisma } from "@/lib/db";
import { formatDateFull } from "@/lib/format";
import { activeSaleWhere } from "@/lib/sales";
import { getSession } from "@/lib/session";
import { normalizeSearch } from "@/lib/text";

export const metadata: Metadata = {
  title: "Verifiko fletushkën",
};

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function FlierDetailPage(props: PageProps<"/menaxho/fletushkat/[id]">) {
  const session = await getSession();
  if (!session) redirect("/hyr");

  const { id } = await props.params;
  const flier = await prisma.flier.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNo: "asc" } },
      drafts: { orderBy: [{ pageNo: "asc" }, { createdAt: "asc" }] },
      _count: { select: { sales: true } },
    },
  });
  if (!flier || flier.chainId !== session.chainId) notFound();

  const pagesDone = flier.pages.filter((p) => p.status === "DONE").length;
  const pendingPages = flier.pages.filter((p) => p.status === "PENDING").length;
  const failedPages = flier.pages.filter((p) => p.status === "FAILED").length;

  // duplicate detection against currently active offers of this chain
  const activeNames = new Set(
    (
      await prisma.sale.findMany({
        where: { chainId: flier.chainId, ...activeSaleWhere() },
        select: { searchName: true },
      })
    ).map((s) => s.searchName),
  );

  const rows: ReviewRow[] = flier.drafts.map((draft) => ({
    draftId: draft.id,
    pageNo: draft.pageNo,
    productName: draft.productName,
    category: draft.category ?? "",
    sizeValue: draft.sizeValue?.toString() ?? "",
    sizeUnit: draft.sizeUnit ?? "",
    oldPrice: draft.oldPriceCents ? (draft.oldPriceCents / 100).toFixed(2) : "",
    newPrice: (draft.newPriceCents / 100).toFixed(2),
    discountPercent: draft.discountPercent,
    duplicate: activeNames.has(normalizeSearch(draft.productName)),
  }));

  const today = new Date();
  const inAWeek = new Date(today.getTime() + 7 * 86_400_000);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/menaxho/fletushkat"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
        >
          ← Fletushkat
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Fletushka e {formatDateFull(flier.createdAt)}
        </h1>
        <p className="text-sm text-ink-soft">
          {flier.pages.length} faqe · {flier.drafts.length} artikuj në pritje · {flier._count.sales} të publikuar
        </p>
      </div>

      {/* page thumbnails */}
      <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4">
        {flier.pages.map((page) => (
          <a key={page.id} href={page.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.imageUrl}
              alt={`Faqja ${page.pageNo}`}
              className={`h-28 w-20 rounded-lg border object-cover ${
                page.status === "FAILED" ? "border-deal opacity-60" : "border-line"
              }`}
            />
          </a>
        ))}
      </div>

      {pendingPages > 0 ? (
        <FlierProcessRunner flierId={flier.id} pagesTotal={flier.pages.length} pagesDone={pagesDone} />
      ) : (
        <>
          {failedPages > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-soft px-4 py-3">
              <p className="text-sm font-semibold text-amber-tag">
                {failedPages} faqe nuk u lexuan dot{flier.error ? ` — ${flier.error}` : "."}
              </p>
              <RetryFailedPagesButton flierId={flier.id} />
            </div>
          )}

          {rows.length > 0 ? (
            <FlierReviewTable
              flierId={flier.id}
              initialRows={rows}
              defaultStartDate={toDateInput(flier.startsAt ?? today)}
              defaultEndDate={toDateInput(flier.endsAt ?? inAWeek)}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center">
              <p className="text-4xl">{flier._count.sales > 0 ? "✅" : "📄"}</p>
              <p className="mt-3 font-bold">
                {flier._count.sales > 0
                  ? `Të gjithë artikujt u shqyrtuan — ${flier._count.sales} oferta të publikuara.`
                  : "S’u gjet asnjë artikull në këtë fletushkë."}
              </p>
              {flier._count.sales > 0 && (
                <Link
                  href={`/fletushka/${flier.id}`}
                  className="mt-4 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/85"
                >
                  Shiko faqen publike
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
