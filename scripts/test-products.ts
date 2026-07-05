// Dev helper: run the direct-product adapters and print what they'd import.
//   npx tsx scripts/test-products.ts
import { PRODUCT_SOURCE_ADAPTERS } from "../src/lib/productSources";

async function main() {
  for (const adapter of PRODUCT_SOURCE_ADAPTERS) {
    try {
      const campaigns = await adapter.fetch();
      console.log(`${adapter.name}: ${campaigns.length} campaign(s)`);
      for (const c of campaigns) {
        console.log(
          `  [${c.title}] ${c.startsAt.toISOString().slice(0, 10)} -> ${c.endsAt.toISOString().slice(0, 10)}, ${c.products.length} products, key ${c.sourceKey}`,
        );
        for (const p of c.products.slice(0, 5)) {
          console.log(
            `    ${p.name} | ${p.category} | ${p.sizeValue}${p.sizeUnit} | ${p.oldPriceCents ?? "-"} -> ${p.newPriceCents} | ${p.imageUrl?.slice(-40)}`,
          );
        }
      }
    } catch (error) {
      console.log(`${adapter.name}: FAILED`, error instanceof Error ? error.message : error);
    }
  }
}
main();
