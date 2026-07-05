// Dev helper: dry-run the Facebook watcher — collect, don't upload.
//   npx tsx scripts/test-fb.ts [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fetchFacebookFliers } from "./fb-pages";

async function main() {
  const outDir = process.argv[2];
  const fliers = await fetchFacebookFliers();
  console.log(`\n${fliers.length} candidate flier(s):`);
  for (const flier of fliers) {
    console.log(
      `  ${flier.chainSlug} | key ${flier.sourceKey} | ${flier.pages.length} pages | ${flier.pages
        .map((p) => `${Math.round(p.length / 1024)}KB`)
        .join(", ")}`,
    );
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      flier.pages.forEach((page, i) => {
        writeFileSync(path.join(outDir, `${flier.chainSlug}-${flier.sourceKey.slice(-8)}-p${i + 1}.jpg`), page);
      });
    }
  }
  if (outDir && fliers.length > 0) console.log("pages written to", outDir);
}
main();
