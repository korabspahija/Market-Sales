// Dev helper: run all flier source adapters and print what they find (no import).
//   npx tsx scripts/test-sources.ts
import { FLIER_SOURCE_ADAPTERS } from "../src/lib/flierSources";

async function main() {
  for (const adapter of FLIER_SOURCE_ADAPTERS) {
    try {
      const source = await adapter.fetch();
      if (!source) {
        console.log(`— ${adapter.name}: no fresh flier`);
        continue;
      }
      console.log(
        `✓ ${adapter.name}: ${source.pdfUrl ? `PDF ${source.pdfUrl}` : `${source.imageUrls?.length} images`} | key ${source.sourceKey.slice(0, 30)}`,
      );
    } catch (error) {
      console.log(`✗ ${adapter.name}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

main();
