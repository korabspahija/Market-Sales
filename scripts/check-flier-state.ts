// Dev helper: summary of a flier's drafts/crops state.
//   npx tsx scripts/check-flier-state.ts <flierId>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const id = process.argv[2];
  const total = await prisma.draftSale.count({ where: { flierId: id } });
  const withCrops = await prisma.draftSale.count({ where: { flierId: id, imageUrl: { not: null } } });
  const flier = await prisma.flier.findUnique({
    where: { id },
    select: { status: true, startsAt: true, endsAt: true },
  });
  console.log(
    `drafts: ${total} | with crops: ${withCrops} | status: ${flier?.status} | validity: ${flier?.startsAt?.toISOString().slice(0, 10)} -> ${flier?.endsAt?.toISOString().slice(0, 10)}`,
  );
  const samples = await prisma.draftSale.findMany({
    where: { flierId: id, imageUrl: { not: null } },
    take: 2,
    select: { imageUrl: true },
  });
  for (const sample of samples) console.log(sample.imageUrl);
}

main().finally(() => prisma.$disconnect());
