// Dev helper: show published sales for a flier.
//   npx tsx scripts/show-flier-sales.ts <flierId>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

prisma.sale
  .findMany({ where: { flierId: process.argv[2] }, orderBy: { createdAt: "asc" } })
  .then((sales) => {
    console.log(`published sales: ${sales.length}`);
    for (const s of sales) {
      console.log(
        `  ${s.productName} | ${s.sizeValue}${s.sizeUnit} | ${(s.oldPriceCents / 100).toFixed(2)} -> ${(s.newPriceCents / 100).toFixed(2)} | ${s.category} | ${s.startsAt.toISOString().slice(0, 10)} -> ${s.endsAt.toISOString().slice(0, 10)}`,
      );
    }
  })
  .finally(() => prisma.$disconnect());
