// Dev helper: simulates a successful AI extraction for a flier so the review
// flow can be tested without an OPENAI_API_KEY.
//   npx tsx scripts/simulate-extraction.ts <flierId>

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const flierId = process.argv[2];
  if (!flierId) throw new Error("usage: tsx scripts/simulate-extraction.ts <flierId>");

  await prisma.draftSale.createMany({
    data: [
      { flierId, pageNo: 1, productName: "Qumësht Vita eko", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 139, newPriceCents: 109 },
      { flierId, pageNo: 1, productName: "Çokollatë Milka Noisette", category: "EMBELSIRA_SNACKS", sizeValue: 100, sizeUnit: "G", oldPriceCents: 129, newPriceCents: 89 },
      { flierId, pageNo: 2, productName: "Detergjent Ariel Color", category: "HIGJIENE_PASTRIM", sizeValue: 2.6, sizeUnit: "KG", oldPriceCents: 849, newPriceCents: 599 },
      // incomplete row on purpose — missing old price + category (manager must fill)
      { flierId, pageNo: 2, productName: "Djathë Sharri rrëshirë", category: null, sizeValue: null, sizeUnit: null, oldPriceCents: null, newPriceCents: 349 },
    ],
  });
  await prisma.flierPage.updateMany({ where: { flierId }, data: { status: "DONE" } });
  await prisma.flier.update({
    where: { id: flierId },
    data: { status: "REVIEW", error: null, startsAt: new Date(), endsAt: new Date(Date.now() + 6 * 86_400_000) },
  });
  console.log("✓ simulated: 4 drafts, pages DONE, flier REVIEW");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
