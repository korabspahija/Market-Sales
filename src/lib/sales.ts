import type { Chain, Sale } from "@/generated/prisma/client";
import type { Category } from "@/generated/prisma/enums";
import { prisma } from "./db";
import { discountPercent } from "./format";
import { normalizeSearch } from "./text";

export type SaleWithChain = Sale & { chain: Chain };

export type SaleSort = "zbritja" | "cmimi" | "rejat";

export type SaleFilters = {
  q?: string;
  chainSlug?: string;
  category?: Category;
  sort?: SaleSort;
};

/** Sales currently visible to shoppers: startsAt <= now < endsAt. */
export function activeSaleWhere(now = new Date()) {
  return { startsAt: { lte: now }, endsAt: { gt: now } };
}

export async function getActiveSales(filters: SaleFilters = {}): Promise<SaleWithChain[]> {
  const { q, chainSlug, category, sort = "zbritja" } = filters;

  const sales = await prisma.sale.findMany({
    where: {
      ...activeSaleWhere(),
      ...(q ? { searchName: { contains: normalizeSearch(q) } } : {}),
      ...(chainSlug ? { chain: { slug: chainSlug } } : {}),
      ...(category ? { category } : {}),
    },
    include: { chain: true },
    orderBy:
      sort === "cmimi" ? { newPriceCents: "asc" } : sort === "rejat" ? { createdAt: "desc" } : undefined,
  });

  if (sort === "zbritja") {
    sales.sort(
      (a, b) =>
        discountPercent(b.oldPriceCents, b.newPriceCents) -
        discountPercent(a.oldPriceCents, a.newPriceCents),
    );
  }

  return sales;
}

/** A single sale for the public detail page; null when missing or not active (unless the owning chain's manager is viewing). */
export async function getVisibleSale(
  id: string,
  viewerChainId?: string,
): Promise<SaleWithChain | null> {
  const sale = await prisma.sale.findUnique({ where: { id }, include: { chain: true } });
  if (!sale) return null;

  const now = new Date();
  const isActive = sale.startsAt <= now && sale.endsAt > now;
  if (!isActive && sale.chainId !== viewerChainId) return null;

  return sale;
}

export function isSaleActive(sale: Pick<Sale, "startsAt" | "endsAt">, now = new Date()): boolean {
  return sale.startsAt <= now && sale.endsAt > now;
}

export type SaleStatus = "aktive" | "skaduar" | "se-shpejti";

export function saleStatus(sale: Pick<Sale, "startsAt" | "endsAt">, now = new Date()): SaleStatus {
  if (sale.endsAt <= now) return "skaduar";
  if (sale.startsAt > now) return "se-shpejti";
  return "aktive";
}
