import { revalidateTag } from "next/cache";
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

/** Re-crop a published offer's image from its source flier page. */
export async function POST(request: Request, ctx: RouteContext<"/api/sales/[id]/crop">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale || sale.chainId !== session.chainId) {
    return NextResponse.json({ error: "Oferta nuk u gjet." }, { status: 404 });
  }
  if (!sale.flierPageUrl) {
    return NextResponse.json({ error: "Kjo ofertë nuk ka fletushkë burimore." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = boxSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  try {
    const imageUrl = await cropBoxFromImage(sale.flierPageUrl, parsed.data);
    await prisma.sale.update({ where: { id: sale.id }, data: { imageUrl } });
    revalidateTag("sales", "max");
    return NextResponse.json({ ok: true, imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prerja e imazhit dështoi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
