import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const now = new Date();
  const [chains, stores, managers, sales, active] = await Promise.all([
    prisma.chain.count(),
    prisma.store.count(),
    prisma.manager.count(),
    prisma.sale.count(),
    prisma.sale.count({ where: { startsAt: { lte: now }, endsAt: { gt: now } } }),
  ]);
  console.log(
    `chains: ${chains} | stores: ${stores} | managers: ${managers} | sales: ${sales} | active now: ${active}`,
  );
}

main().finally(() => prisma.$disconnect());
