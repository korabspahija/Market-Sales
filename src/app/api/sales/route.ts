import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { saveImage, validateImage } from "@/lib/storage";
import { normalizeSearch } from "@/lib/text";
import { firstZodError, saleDateRange, saleInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const form = await request.formData();
  const image = form.get("image");
  const fields = Object.fromEntries([...form.entries()].filter(([key]) => key !== "image"));

  const parsed = saleInputSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Imazhi i produktit është i detyrueshëm." }, { status: 400 });
  }
  const imageError = validateImage(image);
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });

  const imageUrl = await saveImage(image);
  const { startsAt, endsAt } = saleDateRange(parsed.data);

  const sale = await prisma.sale.create({
    data: {
      chainId: session.chainId,
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

  return NextResponse.json({ ok: true, id: sale.id }, { status: 201 });
}
