import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFlierPage } from "@/lib/extraction";
import { getSession } from "@/lib/session";

// one vision call per invocation — the client loops until done
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/fliers/[id]/process">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  let flier = await prisma.flier.findUnique({ where: { id }, include: { pages: true } });
  if (!flier || flier.chainId !== session.chainId) {
    return NextResponse.json({ error: "Fletushka nuk u gjet." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { retryFailed?: boolean } | null;
  if (body?.retryFailed && flier.pages.some((p) => p.status === "FAILED")) {
    await prisma.flierPage.updateMany({
      where: { flierId: id, status: "FAILED" },
      data: { status: "PENDING" },
    });
    await prisma.flier.update({ where: { id }, data: { status: "PROCESSING", error: null } });
    flier = (await prisma.flier.findUnique({ where: { id }, include: { pages: true } }))!;
  }

  const pending = flier.pages
    .filter((p) => p.status === "PENDING")
    .sort((a, b) => a.pageNo - b.pageNo);

  if (pending.length === 0) {
    if (flier.status === "PROCESSING") {
      await prisma.flier.update({ where: { id }, data: { status: "REVIEW" } });
    }
    return NextResponse.json({ done: true, remaining: 0 });
  }

  const page = pending[0];
  try {
    const result = await extractFlierPage(page.imageUrl);

    if (result.items.length > 0) {
      await prisma.draftSale.createMany({
        data: result.items.map((item) => ({
          flierId: flier.id,
          pageNo: page.pageNo,
          productName: item.productName,
          category: item.category,
          sizeValue: item.sizeValue,
          sizeUnit: item.sizeUnit,
          oldPriceCents: item.oldPriceEur ? Math.round(item.oldPriceEur * 100) : null,
          newPriceCents: Math.round(item.newPriceEur * 100),
        })),
      });
    }

    // flier-level validity: first page that mentions dates wins
    const validityUpdate: { startsAt?: Date; endsAt?: Date } = {};
    if (!flier.startsAt && result.validFrom) validityUpdate.startsAt = new Date(result.validFrom);
    if (!flier.endsAt && result.validTo) validityUpdate.endsAt = new Date(result.validTo);

    await prisma.flierPage.update({ where: { id: page.id }, data: { status: "DONE" } });
    if (Object.keys(validityUpdate).length > 0) {
      await prisma.flier.update({ where: { id }, data: validityUpdate });
    }

    const remaining = pending.length - 1;
    if (remaining === 0) {
      await prisma.flier.update({ where: { id }, data: { status: "REVIEW" } });
    }
    return NextResponse.json({
      done: remaining === 0,
      remaining,
      processedPage: page.pageNo,
      itemsFound: result.items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabim i panjohur gjatë leximit.";
    await prisma.flierPage.update({ where: { id: page.id }, data: { status: "FAILED" } });
    await prisma.flier.update({ where: { id }, data: { error: message } });
    return NextResponse.json({ error: message, processedPage: page.pageNo }, { status: 502 });
  }
}
