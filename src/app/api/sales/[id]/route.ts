import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { saveImage, validateImage } from "@/lib/storage";
import { normalizeSearch } from "@/lib/text";
import { firstZodError, saleDateRange, saleInputSchema } from "@/lib/validation";

/** The sale, only if it belongs to the signed-in manager's chain (404 otherwise — never leak other chains). */
async function findOwnSale(id: string, chainId: string) {
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale || sale.chainId !== chainId) return null;
  return sale;
}

export async function PUT(request: Request, ctx: RouteContext<"/api/sales/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  const sale = await findOwnSale(id, session.chainId);
  if (!sale) return NextResponse.json({ error: "Oferta nuk u gjet." }, { status: 404 });

  const form = await request.formData();
  const image = form.get("image");
  const fields = Object.fromEntries([...form.entries()].filter(([key]) => key !== "image"));

  const parsed = saleInputSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  let imageUrl = sale.imageUrl;
  if (image instanceof File && image.size > 0) {
    const imageError = validateImage(image);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
    imageUrl = await saveImage(image);
  }

  const { startsAt, endsAt } = saleDateRange(parsed.data);

  await prisma.sale.update({
    where: { id: sale.id },
    data: {
      productName: parsed.data.productName,
      searchName: normalizeSearch(parsed.data.productName),
      category: parsed.data.category,
      sizeValue: parsed.data.sizeValue,
      sizeUnit: parsed.data.sizeUnit,
      oldPriceCents: parsed.data.oldPrice,
      newPriceCents: parsed.data.newPrice,
      imageUrl,
      startsAt,
      endsAt,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/sales/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  const sale = await findOwnSale(id, session.chainId);
  if (!sale) return NextResponse.json({ error: "Oferta nuk u gjet." }, { status: 404 });

  await prisma.sale.delete({ where: { id: sale.id } });
  return NextResponse.json({ ok: true });
}
