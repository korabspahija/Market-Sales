import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalizeSearch } from "@/lib/text";
import { firstZodError, flierPublishSchema, saleDateRange } from "@/lib/validation";

/** Publish reviewed drafts as live offers, discard the rest. */
export async function POST(request: Request, ctx: RouteContext<"/api/fliers/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  const flier = await prisma.flier.findUnique({
    where: { id },
    include: { drafts: true, pages: true },
  });
  if (!flier || flier.chainId !== session.chainId) {
    return NextResponse.json({ error: "Fletushka nuk u gjet." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = flierPublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  const draftsById = new Map(flier.drafts.map((d) => [d.id, d]));
  for (const row of parsed.data.publish) {
    if (!draftsById.has(row.draftId)) {
      return NextResponse.json({ error: "Njëri nga artikujt nuk i përket kësaj fletushke." }, { status: 400 });
    }
  }

  const pagesByNo = new Map(flier.pages.map((p) => [p.pageNo, p]));
  const { startsAt, endsAt } = saleDateRange(parsed.data);

  await prisma.sale.createMany({
    data: parsed.data.publish.map((row) => {
      const draft = draftsById.get(row.draftId)!;
      return {
        chainId: flier.chainId,
        flierId: flier.id,
        flierPageUrl: pagesByNo.get(draft.pageNo)?.imageUrl ?? null,
        flierPageThumbUrl: pagesByNo.get(draft.pageNo)?.thumbUrl ?? null,
        productName: row.productName,
        searchName: normalizeSearch(row.productName),
        category: row.category,
        sizeValue: row.sizeValue,
        sizeUnit: row.sizeUnit,
        oldPriceCents: row.oldPrice,
        newPriceCents: row.newPrice,
        imageUrl: row.useImage && draft.imageUrl ? draft.imageUrl : `/categories/${row.category}.svg`,
        startsAt,
        endsAt,
      };
    }),
  });

  const processedIds = [
    ...parsed.data.publish.map((row) => row.draftId),
    ...parsed.data.discardIds.filter((discardId) => draftsById.has(discardId)),
  ];
  await prisma.draftSale.deleteMany({ where: { id: { in: processedIds }, flierId: flier.id } });

  const remainingDrafts = await prisma.draftSale.count({ where: { flierId: flier.id } });
  if (remainingDrafts === 0) {
    await prisma.flier.update({ where: { id }, data: { status: "PUBLISHED" } });
  }

  revalidateTag("sales", "max");
  return NextResponse.json({
    ok: true,
    published: parsed.data.publish.length,
    discarded: parsed.data.discardIds.length,
    remainingDrafts,
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/fliers/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  const flier = await prisma.flier.findUnique({ where: { id } });
  if (!flier || flier.chainId !== session.chainId) {
    return NextResponse.json({ error: "Fletushka nuk u gjet." }, { status: 404 });
  }

  // pages + drafts cascade; already-published offers keep living (flierId -> null)
  await prisma.flier.delete({ where: { id } });
  revalidateTag("sales", "max");
  return NextResponse.json({ ok: true });
}
