import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { cropBoxFromImage } from "@/lib/flierImages";
import { getSession } from "@/lib/session";
import { firstZodError } from "@/lib/validation";

const boxSchema = z
  .object({
    x0: z.number().min(0).max(1),
    y0: z.number().min(0).max(1),
    x1: z.number().min(0).max(1),
    y1: z.number().min(0).max(1),
  })
  .refine((b) => b.x1 - b.x0 >= 0.02 && b.y1 - b.y0 >= 0.02, {
    message: "Zona e zgjedhur është shumë e vogël.",
  });

/** Manager picks the exact product region on the flier page for one draft. */
export async function POST(request: Request, ctx: RouteContext<"/api/drafts/[draftId]/crop">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { draftId } = await ctx.params;
  const draft = await prisma.draftSale.findUnique({
    where: { id: draftId },
    include: { flier: { include: { pages: true } } },
  });
  if (!draft || draft.flier.chainId !== session.chainId) {
    return NextResponse.json({ error: "Artikulli nuk u gjet." }, { status: 404 });
  }
  const page = draft.flier.pages.find((p) => p.pageNo === draft.pageNo);
  if (!page) return NextResponse.json({ error: "Faqja e fletushkës nuk u gjet." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = boxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  try {
    const imageUrl = await cropBoxFromImage(page.imageUrl, parsed.data);
    await prisma.draftSale.update({ where: { id: draft.id }, data: { imageUrl } });
    return NextResponse.json({ ok: true, imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prerja e imazhit dështoi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
