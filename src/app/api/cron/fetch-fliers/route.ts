import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { makePageThumbnail } from "@/lib/flierImages";
import { FLIER_SOURCE_ADAPTERS, type FlierSource } from "@/lib/flierSources";
import { pdfToImages } from "@/lib/pdf";
import { processNextPendingPage } from "@/lib/processFlier";
import { saveImageBuffer } from "@/lib/storage";

// fetch + convert is fast; the remaining budget pre-processes pages
export const maxDuration = 300;
const TIME_BUDGET_MS = 240_000;

async function downloadPageBuffers(source: FlierSource): Promise<Buffer[]> {
  if (source.pdfUrl) {
    const res = await fetch(source.pdfUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`PDF ${res.status}`);
    return pdfToImages(Buffer.from(await res.arrayBuffer()));
  }
  const buffers: Buffer[] = [];
  for (const url of source.imageUrls ?? []) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`page ${res.status}`);
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return buffers;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const summary: Record<string, string> = {};
  const newFlierIds: string[] = [];

  for (const adapter of FLIER_SOURCE_ADAPTERS) {
    let source: FlierSource | null = null;
    try {
      source = await adapter.fetch();
      if (!source) {
        summary[adapter.name] = "no fresh flier at source";
        continue;
      }
      const existing = await prisma.flier.findUnique({ where: { sourceKey: source.sourceKey } });
      if (existing) {
        summary[source.chainSlug] = "already imported";
        continue;
      }
      const chain = await prisma.chain.findUnique({ where: { slug: source.chainSlug } });
      if (!chain) {
        summary[source.chainSlug] = "chain missing";
        continue;
      }

      const buffers = await downloadPageBuffers(source);
      if (buffers.length === 0) {
        summary[source.chainSlug] = "no pages";
        continue;
      }

      const flier = await prisma.flier.create({
        data: { chainId: chain.id, sourceKey: source.sourceKey },
      });
      for (let i = 0; i < buffers.length; i++) {
        // normalize to a reasonable size for extraction and storage
        const page = await sharp(buffers[i])
          .resize({ width: 1800, withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        const imageUrl = await saveImageBuffer(page, "image/jpeg");
        const thumbUrl = await makePageThumbnail(page).catch(() => null);
        await prisma.flierPage.create({
          data: { flierId: flier.id, pageNo: i + 1, imageUrl, thumbUrl },
        });
      }
      newFlierIds.push(flier.id);
      summary[source.chainSlug] = `imported ${buffers.length} pages`;
    } catch (error) {
      summary[source?.chainSlug ?? adapter.name] =
        `failed: ${error instanceof Error ? error.message : "unknown"}`;
    }
  }

  // pre-process as many pages as the time budget allows; leftovers are picked
  // up automatically when the manager opens the flier
  let processed = 0;
  for (const flierId of newFlierIds) {
    for (;;) {
      if (Date.now() - started > TIME_BUDGET_MS) break;
      try {
        const result = await processNextPendingPage(flierId);
        if (result.processedPage) processed++;
        if (result.done) break;
      } catch {
        break; // page marked FAILED; manager can retry from the dashboard
      }
    }
  }

  return NextResponse.json({ summary, newFliers: newFlierIds.length, pagesProcessed: processed });
}
