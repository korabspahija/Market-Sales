import sharp from "sharp";
import { computeCropRects } from "./crop";
import { prisma } from "./db";
import { extractFlierPage, type ExtractionResult } from "./extraction";
import { loadImageBuffer } from "./flierImages";
import { saveImageBuffer } from "./storage";

/** Crop every located item out of the page; failures degrade to null (category icon). */
async function cropItems(imageUrl: string, result: ExtractionResult): Promise<(string | null)[]> {
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
    const result = await extractFlierPage(page.imageUrl);

    if (result.items.length > 0) {
      const crops = await cropItems(page.imageUrl, result);
      await prisma.draftSale.createMany({
        data: result.items.map((item, i) => ({
          flierId: flier.id,
          pageNo: page.pageNo,
          productName: item.productName,
          category: item.category,
          sizeValue: item.sizeValue,
          sizeUnit: item.sizeUnit,
          oldPriceCents: item.oldPriceEur ? Math.round(item.oldPriceEur * 100) : null,
          newPriceCents: Math.round(item.newPriceEur * 100),
          discountPercent: item.discountPercent,
          imageUrl: crops[i],
        })),
      });
    }

    // flier-level validity: first page that mentions dates wins
    const validityUpdate: { startsAt?: Date; endsAt?: Date } = {};
    if (!flier.startsAt && result.validFrom) validityUpdate.startsAt = new Date(result.validFrom);
    if (!flier.endsAt && result.validTo) validityUpdate.endsAt = new Date(result.validTo);

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
