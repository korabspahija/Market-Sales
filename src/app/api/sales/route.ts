import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { Category } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getActiveSalesCached, type SaleSort } from "@/lib/sales";
import { getSession } from "@/lib/session";
import { saveImage, validateImage } from "@/lib/storage";
import { normalizeSearch } from "@/lib/text";
import { firstZodError, saleDateRange, saleInputSchema } from "@/lib/validation";

const PAGE_SIZE = 48;

/** Public: one page of active offers, same filters as the home page. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() || undefined;
  const chainSlug = params.get("zinxhiri") || undefined;
  const rawCategory = params.get("kategoria");
  const category = rawCategory && rawCategory in Category ? (rawCategory as Category) : undefined;
  const rendit = params.get("rendit");
  const sort: SaleSort = rendit === "cmimi" || rendit === "rejat" ? rendit : "zbritja";
  const from = Math.max(0, Number.parseInt(params.get("nga") ?? "0", 10) || 0);

  // the full filtered list comes from the same 60s cache the page uses;
  // pagination is just a slice of it
  const sales = await getActiveSalesCached({ q, chainSlug, category, sort });
  return NextResponse.json(
    { total: sales.length, sales: sales.slice(from, from + PAGE_SIZE) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}

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

  revalidateTag("sales", "max");
  return NextResponse.json({ ok: true, id: sale.id }, { status: 201 });
}
