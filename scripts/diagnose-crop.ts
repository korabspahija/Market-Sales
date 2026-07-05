// Dev helper: live two-pass extraction + crop diagnostics for one image.
//   npx tsx scripts/diagnose-crop.ts <absolute-image-path> [outDir]
import "dotenv/config";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { computeCropRects } from "../src/lib/crop";
import { analyzePageLayout, extractFlierPage } from "../src/lib/extraction";

async function main() {
  const [, , src, outDir] = process.argv;
  const stage = path.join(process.cwd(), "public", "uploads", "debug-page.jpg");
  mkdirSync(path.dirname(stage), { recursive: true });
  copyFileSync(src, stage);

  const [result, sections] = await Promise.all([
    extractFlierPage("/uploads/debug-page.jpg"),
    analyzePageLayout("/uploads/debug-page.jpg"),
  ]);

  console.log(`items: ${result.items.length}, model grid: ${result.gridRows}x${result.gridCols}`);
  console.log(
    "layout rows:",
    sections
      ? sections.map((s) => `[y ${s.y0.toFixed(2)}-${s.y1.toFixed(2)}: ${s.cards} cards]`).join(" ")
      : "none",
  );
  const totalCells = sections?.reduce((sum, s) => sum + s.cards, 0) ?? 0;
  console.log(`layout cells: ${totalCells} vs items: ${result.items.length} -> ${totalCells === result.items.length ? "MATCH" : "MISMATCH"}`);

  const buffer = await sharp(stage).toBuffer();
  const meta = await sharp(buffer).metadata();
  const rects = await computeCropRects(
    result.items,
    { rows: result.gridRows, cols: result.gridCols },
    buffer,
    meta.width!,
    meta.height!,
    sections,
  );
  console.log(`rects: ${rects.filter(Boolean).length}/${rects.length}`);

  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    for (let i = 0; i < result.items.length; i++) {
      const rect = rects[i];
      if (!rect) continue;
      const name = result.items[i].productName.replace(/[^a-z0-9]+/gi, "-").slice(0, 30);
      writeFileSync(
        path.join(outDir, `${String(i + 1).padStart(2, "0")}-${name}.jpg`),
        await sharp(buffer).extract(rect).jpeg({ quality: 82 }).toBuffer(),
      );
    }
    console.log("crops written to", outDir);
  }
}

main();
