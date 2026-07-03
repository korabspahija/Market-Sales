// Dev helper: live extraction + full crop-geometry diagnostics for one image.
//   npx tsx scripts/diagnose-crop.ts <absolute-image-path>
import "dotenv/config";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { computeCropRects, detectContentPanel } from "../src/lib/crop";
import { extractFlierPage } from "../src/lib/extraction";

async function main() {
  const src = process.argv[2];
  const stage = path.join(process.cwd(), "public", "uploads", "debug-page.jpg");
  mkdirSync(path.dirname(stage), { recursive: true });
  copyFileSync(src, stage);

  const result = await extractFlierPage("/uploads/debug-page.jpg");
  console.log(`grid: ${result.gridRows} x ${result.gridCols}, items: ${result.items.length}`);
  for (const item of result.items.slice(0, 25)) {
    console.log(
      `  r${item.gridRow ?? "?"} c${item.gridCol ?? "?"} box=${item.box ? [item.box.x0, item.box.y0, item.box.x1, item.box.y1].map((v) => v.toFixed(2)).join(",") : "null"} | ${item.productName.slice(0, 30)}`,
    );
  }

  const buffer = await sharp(stage).toBuffer();
  const panel = await detectContentPanel(buffer);
  console.log("panel:", panel ? Object.values(panel).map((v) => v.toFixed(3)).join(",") : "NOT DETECTED");

  const meta = await sharp(buffer).metadata();
  const rects = await computeCropRects(
    result.items,
    { rows: result.gridRows, cols: result.gridCols },
    buffer,
    meta.width!,
    meta.height!,
  );
  console.log(`rects: ${rects.filter(Boolean).length}/${rects.length} non-null`);
}

main();
