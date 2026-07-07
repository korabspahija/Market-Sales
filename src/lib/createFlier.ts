import { prisma } from "./db";
import { makePageThumbnail } from "./flierImages";
import type { SessionPayload } from "./session";
import { MAX_FLIER_PAGE_BYTES, saveImage, validateImage } from "./storage";

const MAX_PAGES_PER_UPLOAD = 10;
const MAX_PAGES_PER_CHAIN_PER_DAY = 40;

export type CreateFlierResult =
  | { ok: true; id: string; pages: number }
  | { ok: false; error: string; status: number };

/**
 * Creates a flier from uploaded page images for the session's chain, with the
 * same validation and daily ceiling as the manager upload form. Shared by the
 * upload API and the PWA share-target handler.
 */
export async function createFlierFromFiles(
  session: SessionPayload,
  files: File[],
): Promise<CreateFlierResult> {
  const pages = files.filter((p) => p instanceof File && p.size > 0);
  if (pages.length === 0) {
    return { ok: false, error: "Ngarko së paku një faqe të fletushkës.", status: 400 };
  }
  if (pages.length > MAX_PAGES_PER_UPLOAD) {
    return { ok: false, error: `Maksimumi ${MAX_PAGES_PER_UPLOAD} faqe për fletushkë.`, status: 400 };
  }
  for (const page of pages) {
    if (page.type === "image/svg+xml") {
      return { ok: false, error: "Faqet duhet të jenë JPG, PNG ose WEBP.", status: 400 };
    }
    const imageError = validateImage(page, MAX_FLIER_PAGE_BYTES);
    if (imageError) return { ok: false, error: imageError, status: 400 };
  }

  // page-based daily limit per chain, so the AI spend has a hard ceiling
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const pagesToday = await prisma.flierPage.count({
    where: { flier: { chainId: session.chainId, createdAt: { gte: dayStart } } },
  });
  if (pagesToday + pages.length > MAX_PAGES_PER_CHAIN_PER_DAY) {
    return {
      ok: false,
      error: `U arrit limiti ditor prej ${MAX_PAGES_PER_CHAIN_PER_DAY} faqesh për këtë market. Provo nesër.`,
      status: 429,
    };
  }

  const flier = await prisma.flier.create({ data: { chainId: session.chainId } });
  for (let i = 0; i < pages.length; i++) {
    const buffer = Buffer.from(await pages[i].arrayBuffer());
    const imageUrl = await saveImage(pages[i]);
    const thumbUrl = await makePageThumbnail(buffer).catch(() => null);
    await prisma.flierPage.create({
      data: { flierId: flier.id, pageNo: i + 1, imageUrl, thumbUrl },
    });
  }

  return { ok: true, id: flier.id, pages: pages.length };
}
