// Dev helper: show the latest flier + its drafts for a chain slug.
//   npx tsx scripts/show-latest-flier.ts <chainSlug>
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const flier = await prisma.flier.findFirst({
    where: { chain: { slug: process.argv[2] } },
    orderBy: { createdAt: "desc" },
    include: { drafts: { orderBy: { createdAt: "asc" } }, pages: true },
  });
  if (!flier) {
    console.log("no flier found");
    return;
  }
  console.log(`flier ${flier.id} | status ${flier.status} | validity ${flier.startsAt?.toISOString() ?? "?"} -> ${flier.endsAt?.toISOString() ?? "?"} | ${flier.pages.length} pages`);
  console.log(`drafts: ${flier.drafts.length}`);
  for (const d of flier.drafts) {
    const old = d.oldPriceCents === null ? "?" : (d.oldPriceCents / 100).toFixed(2);
    console.log(
      `  ${d.productName} | ${d.sizeValue ?? "?"}${d.sizeUnit ?? "?"} | ${old} -> ${(d.newPriceCents / 100).toFixed(2)} | ${d.category ?? "?"}`,
    );
  }
}

main().finally(() => prisma.$disconnect());
