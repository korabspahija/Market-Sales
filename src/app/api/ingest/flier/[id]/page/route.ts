import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { makePageThumbnail } from "@/lib/flierImages";
import { saveImageBuffer } from "@/lib/storage";

export const maxDuration = 60;

/** Step 2 of the laptop-agent upload: one page image per request. */
export async function POST(request: Request, ctx: RouteContext<"/api/ingest/flier/[id]/page">) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const flier = await prisma.flier.findUnique({ where: { id } });
  // only agent-created fliers (they always carry a sourceKey), and only
  // while still unprocessed
  if (!flier || !flier.sourceKey || flier.status !== "PROCESSING") {
    return NextResponse.json({ error: "flier not open for pages" }, { status: 409 });
  }

  const form = await request.formData();
  const file = form.get("page");
  const pageNo = Number(form.get("pageNo"));
  if (!(file instanceof File) || file.size === 0 || !Number.isInteger(pageNo) || pageNo < 1) {
    return NextResponse.json({ error: "page file and pageNo required" }, { status: 400 });
  }

  // same normalization as the cron import path
  const page = await sharp(Buffer.from(await file.arrayBuffer()))
    .resize({ width: 1800, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  const imageUrl = await saveImageBuffer(page, "image/jpeg");
  const thumbUrl = await makePageThumbnail(page).catch(() => null);

  await prisma.flierPage.upsert({
    where: { flierId_pageNo: { flierId: id, pageNo } },
    create: { flierId: id, pageNo, imageUrl, thumbUrl },
    update: { imageUrl, thumbUrl, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, pageNo }, { status: 201 });
}
