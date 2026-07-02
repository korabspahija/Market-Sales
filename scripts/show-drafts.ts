// Dev helper: show extracted drafts for a flier.
//   npx tsx scripts/show-drafts.ts <flierId>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

prisma.draftSale
  .findMany({ where: { flierId: process.argv[2] } })
  .then((drafts) => {
    for (const d of drafts) {
      console.log(
        `${d.productName} | ${d.sizeValue ?? "?"} ${d.sizeUnit ?? "?"} | old ${d.oldPriceCents ?? "?"}c -> new ${d.newPriceCents}c | ${d.category ?? "?"} | page ${d.pageNo}`,
      );
    }
  })
  .finally(() => prisma.$disconnect());
