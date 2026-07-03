// One-off: generate 320px thumbnails for existing flier pages and copy them
// onto their published sales.
//   npx tsx scripts/backfill-thumbs.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadImageBuffer, makePageThumbnail } from "../src/lib/flierImages";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const pages = await prisma.flierPage.findMany({ where: { thumbUrl: null } });
  for (const page of pages) {
    try {
      const thumbUrl = await makePageThumbnail(await loadImageBuffer(page.imageUrl));
      await prisma.flierPage.update({ where: { id: page.id }, data: { thumbUrl } });
      console.log(`✓ page ${page.id} (${page.pageNo})`);
    } catch (error) {
      console.log(`✗ page ${page.id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const refreshed = await prisma.flierPage.findMany({ where: { thumbUrl: { not: null } } });
  let salesUpdated = 0;
  for (const page of refreshed) {
    const result = await prisma.sale.updateMany({
      where: { flierPageUrl: page.imageUrl, flierPageThumbUrl: null },
      data: { flierPageThumbUrl: page.thumbUrl },
    });
    salesUpdated += result.count;
  }

  // sales whose source flier was deleted still carry the page URL — generate
  // one thumb per unique page and share it
  const orphans = await prisma.sale.findMany({
    where: { flierPageUrl: { not: null }, flierPageThumbUrl: null },
    select: { flierPageUrl: true },
    distinct: ["flierPageUrl"],
  });
  for (const { flierPageUrl } of orphans) {
    try {
      const thumbUrl = await makePageThumbnail(await loadImageBuffer(flierPageUrl!));
      const result = await prisma.sale.updateMany({
        where: { flierPageUrl, flierPageThumbUrl: null },
        data: { flierPageThumbUrl: thumbUrl },
      });
      salesUpdated += result.count;
      console.log(`✓ orphan page thumb (${result.count} sales)`);
    } catch (error) {
      console.log(`✗ orphan ${flierPageUrl}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`pages backfilled: ${pages.length}, sales updated: ${salesUpdated}`);
}

main().finally(() => prisma.$disconnect());
