import { revalidateTag } from "next/cache";
import sharp from "sharp";
import { computeCropRects } from "./crop";
import { prisma } from "./db";
import { normalizeSearch } from "./text";
import {
  analyzePageLayout,
  extractFlierPage,
  type ExtractionResult,
  type LayoutRow,
} from "./extraction";
import { loadImageBuffer } from "./flierImages";
import { saveImageBuffer } from "./storage";

/** Crop every located item out of the page; failures degrade to null (category icon). */
async function cropItems(
  imageUrl: string,
  result: ExtractionResult,
  sections: LayoutRow[] | null,
): Promise<(string | null)[]> {
  try {
    const buffer = await loadImageBuffer(imageUrl);
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return result.items.map(() => null);

    const rects = await computeCropRects(
      result.items,
      { rows: result.gridRows, cols: result.gridCols },
      buffer,
      meta.width,
      meta.height,
      sections,
    );
    return Promise.all(
      rects.map(async (rect) => {
        if (!rect) return null;
        try {
          const crop = await sharp(buffer)
            .extract(rect)
            .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toBuffer();
          return await saveImageBuffer(crop, "image/jpeg");
        } catch {
          return null;
        }
      }),
    );
  } catch {
    return result.items.map(() => null);
  }
}

export type ProcessResult = {
  done: boolean;
  remaining: number;
  processedPage?: number;
  itemsFound?: number;
};

/**
 * Extracts one pending page of a flier into draft offers (with crops) and
 * advances the flier's status. Shared by the manager-driven processing route
 * and the nightly auto-fetch cron.
 */
export async function processNextPendingPage(flierId: string): Promise<ProcessResult> {
  const flier = await prisma.flier.findUnique({ where: { id: flierId }, include: { pages: true } });
  if (!flier) throw new Error("Fletushka nuk u gjet.");

  const pending = flier.pages
    .filter((p) => p.status === "PENDING")
    .sort((a, b) => a.pageNo - b.pageNo);

  if (pending.length === 0) {
    if (flier.status === "PROCESSING") {
      await prisma.flier.update({ where: { id: flierId }, data: { status: "REVIEW" } });
    }
    return { done: true, remaining: 0 };
  }

  const page = pending[0];
  try {
    // two passes in parallel: what's on the page, and how the page is laid out
    const [result, sections] = await Promise.all([
      extractFlierPage(page.imageUrl),
      analyzePageLayout(page.imageUrl).catch(() => null),
    ]);

    if (result.items.length > 0) {
      const crops = await cropItems(page.imageUrl, result, sections);
      await prisma.draftSale.createMany({
        data: result.items.map((item, i) => ({
          flierId: flier.id,
          pageNo: page.pageNo,
          productName: item.productName,
          category: item.category,
          // unreadable size on the flier -> sold by the piece
          sizeValue: item.sizeValue ?? 1,
          sizeUnit: item.sizeUnit ?? "COPE",
          oldPriceCents: item.oldPriceEur ? Math.round(item.oldPriceEur * 100) : null,
          newPriceCents: Math.round(item.newPriceEur * 100),
          discountPercent: item.discountPercent,
          imageUrl: crops[i],
        })),
      });
    }

    // flier-level validity: banner pages carry broad campaign ranges ("valide
    // deri në shtator"), so the page with the NARROWEST complete range wins —
    // that's the actual weekly validity
    const validityUpdate: { startsAt?: Date; endsAt?: Date } = {};
    const from = result.validFrom ? new Date(result.validFrom) : null;
    const to = result.validTo ? new Date(result.validTo) : null;
    if (from && to) {
      const span = to.getTime() - from.getTime();
      const currentSpan =
        flier.startsAt && flier.endsAt
          ? flier.endsAt.getTime() - flier.startsAt.getTime()
          : Infinity;
      if (span > 0 && span < currentSpan) {
        validityUpdate.startsAt = from;
        validityUpdate.endsAt = to;
      }
    } else {
      if (!flier.startsAt && from) validityUpdate.startsAt = from;
      if (!flier.endsAt && to) validityUpdate.endsAt = to;
    }

    await prisma.flierPage.update({ where: { id: page.id }, data: { status: "DONE" } });
    if (Object.keys(validityUpdate).length > 0) {
      await prisma.flier.update({ where: { id: flierId }, data: validityUpdate });
    }

    const remaining = pending.length - 1;
    if (remaining === 0) {
      await prisma.flier.update({ where: { id: flierId }, data: { status: "REVIEW" } });
    }
    return { done: remaining === 0, remaining, processedPage: page.pageNo, itemsFound: result.items.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabim i panjohur gjatë leximit.";
    await prisma.flierPage.update({ where: { id: page.id }, data: { status: "FAILED" } });
    await prisma.flier.update({ where: { id: flierId }, data: { error: message } });
    throw new PageProcessError(message, page.pageNo);
  }
}

export class PageProcessError extends Error {
  constructor(
    message: string,
    public readonly pageNo: number,
  ) {
    super(message);
  }
}

/**
 * Publishes every draft of a fully-processed flier as live offers — the
 * no-review path for auto-fetched fliers (manual uploads keep the review
 * queue). Already-expired fliers discard their drafts instead of publishing.
 * Returns the number of offers published.
 */
export async function autoPublishFlier(flierId: string): Promise<number> {
  const flier = await prisma.flier.findUnique({
    where: { id: flierId },
    include: { drafts: true, pages: true },
  });
  if (!flier || flier.status !== "REVIEW") return 0;

  const now = new Date();
  const startsAt = flier.startsAt ?? now;
  const endsAt = flier.endsAt ?? new Date(now.getTime() + 7 * 86_400_000);

  if (flier.drafts.length === 0 || endsAt <= now) {
    await prisma.draftSale.deleteMany({ where: { flierId } });
    await prisma.flier.update({ where: { id: flierId }, data: { status: "PUBLISHED" } });
    return 0;
  }

  // compare-and-swap claim: whatever invokes this twice (overlapping cron
  // runs, platform retries, the connection-retry wrapper), only the run that
  // flips REVIEW -> PUBLISHED gets to insert the offers
  const claimed = await prisma.flier.updateMany({
    where: { id: flierId, status: "REVIEW" },
    data: { status: "PUBLISHED" },
  });
  if (claimed.count === 0) return 0;

  const pagesByNo = new Map(flier.pages.map((p) => [p.pageNo, p]));
  await prisma.sale.createMany({
    data: flier.drafts.map((draft) => {
      const category = draft.category ?? "USHQIME_BAZE";
      // no readable struck-through price: derive it from the printed discount
      // badge, or fall back to "no discount shown"
      const oldPriceCents =
        draft.oldPriceCents ??
        (draft.discountPercent && draft.discountPercent > 0 && draft.discountPercent < 95
          ? Math.round(draft.newPriceCents / (1 - draft.discountPercent / 100))
          : draft.newPriceCents);
      return {
        chainId: flier.chainId,
        flierId: flier.id,
        flierPageUrl: pagesByNo.get(draft.pageNo)?.imageUrl ?? null,
        flierPageThumbUrl: pagesByNo.get(draft.pageNo)?.thumbUrl ?? null,
        productName: draft.productName,
        searchName: normalizeSearch(draft.productName),
        category,
        sizeValue: draft.sizeValue ?? 1,
        sizeUnit: draft.sizeUnit ?? "COPE",
        oldPriceCents,
        newPriceCents: draft.newPriceCents,
        imageUrl: draft.imageUrl ?? `/categories/${category}.svg`,
        startsAt,
        endsAt,
      };
    }),
  });

  await prisma.draftSale.deleteMany({ where: { flierId } });
  revalidateTag("sales", "max");
  return flier.drafts.length;
}
