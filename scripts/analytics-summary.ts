// Quick read of captured usage events.
//   npx tsx scripts/analytics-summary.ts [days]
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const days = Number(process.argv[2] ?? 7);
  const since = new Date(Date.now() - days * 86_400_000);
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  console.log(`— last ${days} days: ${events.length} events —`);
  const byType = new Map<string, number>();
  for (const event of events) byType.set(event.type, (byType.get(event.type) ?? 0) + 1);
  for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  const top = (type: string, key: string, label: string) => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.type !== type) continue;
      const value = (event.data as Record<string, unknown>)?.[key];
      if (typeof value === "string" && value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    if (sorted.length === 0) return;
    console.log(`\n${label}:`);
    for (const [value, count] of sorted) console.log(`  ${count}× ${value}`);
  };

  top("search", "q", "top searches");
  top("offer_view", "product", "most viewed products");
  top("offer_view", "chain", "views per chain");
  top("filter_use", "chain", "chain filter usage");
  top("share", "channel", "shares per channel");

  // searches that found nothing = missing supply, the most valuable signal
  const misses = events.filter(
    (e) => e.type === "search" && (e.data as Record<string, unknown>)?.results === 0,
  );
  if (misses.length > 0) {
    console.log(`\nsearches with 0 results (${misses.length}):`);
    const counts = new Map<string, number>();
    for (const e of misses) {
      const q = String((e.data as Record<string, unknown>).q ?? "");
      counts.set(q, (counts.get(q) ?? 0) + 1);
    }
    for (const [q, count] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`  ${count}× "${q}"`);
    }
  }
}

main().finally(() => prisma.$disconnect());
