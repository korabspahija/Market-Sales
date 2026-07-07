import type { Chain } from "@/generated/prisma/client";
import { prisma } from "./db";
import { activeSaleWhere } from "./sales";

/**
 * Cross-chain analytics for the admin dashboard. Event volume is small
 * (hundreds/day), so everything is fetched for the window and aggregated in
 * JS — no materialized views needed at this scale.
 */

type EventRow = {
  type: string;
  data: unknown;
  createdAt: Date;
};

export type Trend = { current: number; previous: number };

export type TopEntry = { key: string; count: number };

export type AdminStats = {
  days: number;
  totals: {
    events: Trend;
    searches: Trend;
    offerViews: Trend;
    listCompares: Trend;
    shares: Trend;
    flierViews: Trend;
  };
  daily: { day: string; count: number }[];
  topSearches: { q: string; count: number; zeroResults: boolean }[];
  zeroResultSearches: TopEntry[];
  listaTopLines: TopEntry[];
  listaUnmatched: TopEntry[];
  listaWinners: TopEntry[];
  viewsByChain: TopEntry[];
  viewsByCategory: TopEntry[];
  topProducts: TopEntry[];
  topFliers: { label: string; count: number }[];
  sharesByChannel: TopEntry[];
  chainHealth: {
    slug: string;
    name: string;
    activeOffers: number;
    latestFlierAt: Date | null;
  }[];
};

function field(data: unknown, key: string): string {
  if (data && typeof data === "object" && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "";
}

function lines(data: unknown, key: string): string[] {
  if (data && typeof data === "object" && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function topOf(counts: Map<string, number>, limit: number): TopEntry[] {
  return [...counts.entries()]
    .filter(([key]) => key !== "")
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function bump(map: Map<string, number>, key: string, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + by);
}

export async function getAdminStats(days: number): Promise<AdminStats> {
  const now = new Date();
  const since = new Date(now.getTime() - days * 86_400_000);
  const previousSince = new Date(since.getTime() - days * 86_400_000);

  const [events, chains, saleCounts, latestFliers] = await Promise.all([
    prisma.event.findMany({
      where: { createdAt: { gte: previousSince } },
      select: { type: true, data: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }) as Promise<EventRow[]>,
    prisma.chain.findMany({ orderBy: { name: "asc" } }),
    prisma.sale.groupBy({ by: ["chainId"], where: activeSaleWhere(), _count: { _all: true } }),
    prisma.flier.findMany({
      where: { pages: { some: {} } },
      orderBy: { createdAt: "desc" },
      select: { chainId: true, createdAt: true },
    }),
  ]);

  const chainName = new Map<string, string>(chains.map((c: Chain) => [c.slug, c.name]));
  const current = events.filter((e) => e.createdAt >= since);
  const previous = events.filter((e) => e.createdAt < since);

  const countType = (rows: EventRow[], type?: string) =>
    type ? rows.filter((e) => e.type === type).length : rows.length;
  const trend = (type?: string): Trend => ({
    current: countType(current, type),
    previous: countType(previous, type),
  });

  // daily activity for the window
  const daily: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 86_400_000);
    const key = dayStart.toISOString().slice(0, 10);
    daily.push({ day: key, count: 0 });
  }
  const dailyIndex = new Map(daily.map((d, i) => [d.day, i]));
  for (const event of current) {
    const key = event.createdAt.toISOString().slice(0, 10);
    const index = dailyIndex.get(key);
    if (index !== undefined) daily[index].count++;
  }

  // searches
  const searchCounts = new Map<string, number>();
  const searchZero = new Map<string, boolean>();
  for (const event of current) {
    if (event.type !== "search") continue;
    const q = field(event.data, "q");
    if (!q) continue;
    bump(searchCounts, q);
    const results = Number(field(event.data, "results"));
    // a search is a gap only if it NEVER returned results in the window
    searchZero.set(q, (searchZero.get(q) ?? true) && results === 0);
  }
  const topSearches = topOf(searchCounts, 12).map((entry) => ({
    q: entry.key,
    count: entry.count,
    zeroResults: searchZero.get(entry.key) ?? false,
  }));
  const zeroResultSearches = topOf(
    new Map([...searchCounts].filter(([q]) => searchZero.get(q))),
    12,
  );

  // lista
  const listaLineCounts = new Map<string, number>();
  const listaUnmatchedCounts = new Map<string, number>();
  const listaWinnerCounts = new Map<string, number>();
  for (const event of current) {
    if (event.type !== "list_compare") continue;
    for (const line of lines(event.data, "lines")) bump(listaLineCounts, line);
    for (const line of lines(event.data, "unmatched")) bump(listaUnmatchedCounts, line);
    bump(listaWinnerCounts, chainName.get(field(event.data, "winner")) ?? field(event.data, "winner"));
  }

  // offer views
  const chainViews = new Map<string, number>();
  const categoryViews = new Map<string, number>();
  const productViews = new Map<string, number>();
  for (const event of current) {
    if (event.type !== "offer_view") continue;
    bump(chainViews, chainName.get(field(event.data, "chain")) ?? field(event.data, "chain"));
    bump(categoryViews, field(event.data, "category"));
    bump(productViews, field(event.data, "product"));
  }

  // flier views
  const flierViews = new Map<string, number>();
  for (const event of current) {
    if (event.type !== "flier_view") continue;
    const chain = chainName.get(field(event.data, "chain")) ?? field(event.data, "chain");
    const id = field(event.data, "flierId");
    bump(flierViews, `${chain} · ${id.slice(-6)}`);
  }

  // shares
  const shareChannels = new Map<string, number>();
  for (const event of current) {
    if (event.type !== "share") continue;
    bump(shareChannels, field(event.data, "channel"));
  }

  // chain health (ops corner)
  const offersByChainId = new Map(saleCounts.map((s) => [s.chainId, s._count._all]));
  const latestFlierByChainId = new Map<string, Date>();
  for (const flier of latestFliers) {
    if (!latestFlierByChainId.has(flier.chainId)) latestFlierByChainId.set(flier.chainId, flier.createdAt);
  }
  const chainHealth = chains.map((chain: Chain) => ({
    slug: chain.slug,
    name: chain.name,
    activeOffers: offersByChainId.get(chain.id) ?? 0,
    latestFlierAt: latestFlierByChainId.get(chain.id) ?? null,
  }));

  return {
    days,
    totals: {
      events: trend(),
      searches: trend("search"),
      offerViews: trend("offer_view"),
      listCompares: trend("list_compare"),
      shares: trend("share"),
      flierViews: trend("flier_view"),
    },
    daily,
    topSearches,
    zeroResultSearches,
    listaTopLines: topOf(listaLineCounts, 12),
    listaUnmatched: topOf(listaUnmatchedCounts, 12),
    listaWinners: topOf(listaWinnerCounts, 10),
    viewsByChain: topOf(chainViews, 10),
    viewsByCategory: topOf(categoryViews, 10),
    topProducts: topOf(productViews, 10),
    topFliers: topOf(flierViews, 8).map((entry) => ({ label: entry.key, count: entry.count })),
    sharesByChannel: topOf(shareChannels, 5),
    chainHealth,
  };
}
