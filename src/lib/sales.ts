import { unstable_cache } from "next/cache";
import type { Chain, Sale } from "@/generated/prisma/client";
import type { Category, FlierStatus } from "@/generated/prisma/enums";
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

/**
 * Fliers worth showing publicly: imported or reviewed (the flier image is the
 * chain's own public material, so it doesn't wait for the product review),
 * and still valid — or too fresh for the validity to be known yet.
 */
export function currentFlierWhere(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const freshLimit = new Date(today);
  freshLimit.setDate(freshLimit.getDate() - 14);
  return {
    status: { in: ["REVIEW", "PUBLISHED"] satisfies FlierStatus[] },
    OR: [{ endsAt: { gte: today } }, { endsAt: null, createdAt: { gte: freshLimit } }],
  };
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
  const sale = await getSaleCached(id);
  if (!sale) return null;

  const now = new Date();
  const isActive = sale.startsAt <= now && sale.endsAt > now;
  if (!isActive && sale.chainId !== viewerChainId) return null;

  return sale;
}

export function isSaleActive(sale: Pick<Sale, "startsAt" | "endsAt">, now = new Date()): boolean {
  return sale.startsAt <= now && sale.endsAt > now;
}

/** unstable_cache serializes to JSON — revive the Date fields on cache hits. */
function reviveSale<T extends SaleWithChain>(sale: T): T {
  return {
    ...sale,
    startsAt: new Date(sale.startsAt),
    endsAt: new Date(sale.endsAt),
    createdAt: new Date(sale.createdAt),
    updatedAt: new Date(sale.updatedAt),
  };
}

const cachedActiveSales = unstable_cache(
  async (chainSlug: string, category: string, sort: string) =>
    getActiveSales({
      chainSlug: chainSlug || undefined,
      category: (category || undefined) as Category | undefined,
      sort: sort as SaleSort,
    }),
  ["active-sales"],
  { revalidate: 60, tags: ["sales"] },
);

/**
 * Cached (60s) variant for the public pages — offers change weekly, so the
 * DB sees at most one query per filter combination per minute regardless of
 * traffic. Free-text searches bypass the cache (unbounded key space).
 */
export async function getActiveSalesCached(filters: SaleFilters = {}): Promise<SaleWithChain[]> {
  if (filters.q) return getActiveSales(filters);
  const sales = await cachedActiveSales(
    filters.chainSlug ?? "",
    filters.category ?? "",
    filters.sort ?? "zbritja",
  );
  return sales.map(reviveSale);
}

const cachedSaleById = unstable_cache(
  async (id: string) => prisma.sale.findUnique({ where: { id }, include: { chain: true } }),
  ["sale-by-id"],
  { revalidate: 60, tags: ["sales"] },
);

export async function getSaleCached(id: string): Promise<SaleWithChain | null> {
  const sale = await cachedSaleById(id);
  return sale ? reviveSale(sale) : null;
}

export const getChainsCached = unstable_cache(
  async () => prisma.chain.findMany({ orderBy: { name: "asc" } }),
  ["chains"],
  { revalidate: 3600, tags: ["chains"] },
);

export const getChainStoresCached = unstable_cache(
  async (chainId: string) =>
    prisma.store.findMany({
      where: { chainId },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
  ["chain-stores"],
  { revalidate: 3600, tags: ["stores"] },
);

/** Everything the /dyqanet page needs — 34 stores, filtered in JS after the cache. */
export const getStoresPageDataCached = unstable_cache(
  async () => {
    const [stores, saleCounts, cityCounts] = await Promise.all([
      prisma.store.findMany({
        include: { chain: true },
        orderBy: [{ city: "asc" }, { name: "asc" }],
      }),
      prisma.sale.groupBy({
        by: ["chainId"],
        where: activeSaleWhere(),
        _count: { _all: true },
      }),
      prisma.store.groupBy({
        by: ["city"],
        _count: { _all: true },
        orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      }),
    ]);
    return { stores, saleCounts, cityCounts };
  },
  ["stores-page"],
  { revalidate: 60, tags: ["sales", "stores"] },
);

const cachedChainPage = unstable_cache(
  async (slug: string) => {
    const chain = await prisma.chain.findUnique({ where: { slug } });
    if (!chain) return null;
    const [sales, stores, flier] = await Promise.all([
      prisma.sale.findMany({
        where: { chainId: chain.id, ...activeSaleWhere() },
        include: { chain: true },
      }),
      prisma.store.findMany({
        where: { chainId: chain.id },
        orderBy: [{ city: "asc" }, { name: "asc" }],
      }),
      prisma.flier.findFirst({
        where: { chainId: chain.id, ...currentFlierWhere() },
        orderBy: { createdAt: "desc" },
        include: { pages: { orderBy: { pageNo: "asc" } } },
      }),
    ]);
    return { chain, sales, stores, flier };
  },
  ["chain-page"],
  { revalidate: 60, tags: ["sales", "chains", "stores"] },
);

/** Everything the /marketi/[slug] page needs, cached 60s. */
export async function getChainPageCached(slug: string) {
  const data = await cachedChainPage(slug);
  if (!data) return null;
  const sales = data.sales.map(reviveSale);
  sales.sort(
    (a, b) =>
      discountPercent(b.oldPriceCents, b.newPriceCents) -
      discountPercent(a.oldPriceCents, a.newPriceCents),
  );
  return {
    chain: data.chain,
    stores: data.stores,
    sales,
    flier: data.flier
      ? {
          ...data.flier,
          startsAt: data.flier.startsAt ? new Date(data.flier.startsAt) : null,
          endsAt: data.flier.endsAt ? new Date(data.flier.endsAt) : null,
          createdAt: new Date(data.flier.createdAt),
        }
      : null,
  };
}

const cachedPublicFlier = unstable_cache(
  async (id: string) => {
    const flier = await prisma.flier.findUnique({
      where: { id },
      include: { chain: true, pages: { orderBy: { pageNo: "asc" } } },
    });
    if (!flier) return null;
    const sales = await prisma.sale.findMany({
      where: { flierId: id, ...activeSaleWhere() },
      include: { chain: true },
      orderBy: { newPriceCents: "asc" },
    });
    return { flier, sales };
  },
  ["public-flier"],
  { revalidate: 60, tags: ["sales"] },
);

export async function getPublicFlierCached(id: string) {
  const data = await cachedPublicFlier(id);
  if (!data) return null;
  return {
    flier: {
      ...data.flier,
      startsAt: data.flier.startsAt ? new Date(data.flier.startsAt) : null,
      endsAt: data.flier.endsAt ? new Date(data.flier.endsAt) : null,
      createdAt: new Date(data.flier.createdAt),
    },
    sales: data.sales.map(reviveSale),
  };
}

const cachedPublicFliers = unstable_cache(
  async () => {
    const fliers = await prisma.flier.findMany({
      where: { ...currentFlierWhere(), pages: { some: {} } },
      include: {
        chain: true,
        pages: { orderBy: { pageNo: "asc" }, take: 1 },
        _count: { select: { pages: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const saleCounts = await prisma.sale.groupBy({
      by: ["flierId"],
      where: { flierId: { in: fliers.map((f) => f.id) }, ...activeSaleWhere() },
      _count: { _all: true },
    });
    return { fliers, saleCounts };
  },
  ["public-fliers"],
  { revalidate: 60, tags: ["sales"] },
);

export type PublicFlierCard = {
  id: string;
  chain: Chain;
  cover: string | null;
  pageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  activeSales: number;
};

/** The /fletushkat index + home strip: every current flier as a card. */
export async function getPublicFliersCached(): Promise<PublicFlierCard[]> {
  const { fliers, saleCounts } = await cachedPublicFliers();
  const counts = new Map(saleCounts.map((c) => [c.flierId, c._count._all]));
  return fliers.map((f) => ({
    id: f.id,
    chain: f.chain,
    cover: f.pages[0]?.thumbUrl ?? f.pages[0]?.imageUrl ?? null,
    pageCount: f._count.pages,
    startsAt: f.startsAt ? new Date(f.startsAt) : null,
    endsAt: f.endsAt ? new Date(f.endsAt) : null,
    createdAt: new Date(f.createdAt),
    activeSales: counts.get(f.id) ?? 0,
  }));
}

export type SaleStatus = "aktive" | "skaduar" | "se-shpejti";

export function saleStatus(sale: Pick<Sale, "startsAt" | "endsAt">, now = new Date()): SaleStatus {
  if (sale.endsAt <= now) return "skaduar";
  if (sale.startsAt > now) return "se-shpejti";
  return "aktive";
}
