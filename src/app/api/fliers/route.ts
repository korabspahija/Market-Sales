import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makePageThumbnail } from "@/lib/flierImages";
import { getSession } from "@/lib/session";
import { MAX_FLIER_PAGE_BYTES, saveImage, validateImage } from "@/lib/storage";

const MAX_PAGES_PER_UPLOAD = 10;
const MAX_PAGES_PER_CHAIN_PER_DAY = 40;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const form = await request.formData();
  const pages = form.getAll("pages").filter((p): p is File => p instanceof File && p.size > 0);

  if (pages.length === 0) {
    return NextResponse.json({ error: "Ngarko së paku një faqe të fletushkës." }, { status: 400 });
  }
  if (pages.length > MAX_PAGES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Maksimumi ${MAX_PAGES_PER_UPLOAD} faqe për fletushkë.` },
      { status: 400 },
    );
  }
  for (const page of pages) {
    if (page.type === "image/svg+xml") {
      return NextResponse.json({ error: "Faqet e fletushkës duhet të jenë JPG, PNG ose WEBP." }, { status: 400 });
    }
    const imageError = validateImage(page, MAX_FLIER_PAGE_BYTES);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }

  // page-based daily limit per chain, so the AI spend has a hard ceiling
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const pagesToday = await prisma.flierPage.count({
    where: { flier: { chainId: session.chainId, createdAt: { gte: dayStart } } },
  });
  if (pagesToday + pages.length > MAX_PAGES_PER_CHAIN_PER_DAY) {
    return NextResponse.json(
      { error: `U arrit limiti ditor prej ${MAX_PAGES_PER_CHAIN_PER_DAY} faqesh për këtë market. Provo nesër.` },
      { status: 429 },
    );
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

  return NextResponse.json({ ok: true, id: flier.id, pages: pages.length }, { status: 201 });
}
