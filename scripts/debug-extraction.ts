// Dev helper: dump raw extraction (grid + boxes) for a local image file.
//   npx tsx scripts/debug-extraction.ts <absolute-image-path>
import "dotenv/config";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { extractFlierPage } from "../src/lib/extraction";

async function main() {
  const src = process.argv[2];
  // extractFlierPage reads relative to public/, so stage the file there
  const stage = path.join(process.cwd(), "public", "uploads", "debug-page.jpg");
  mkdirSync(path.dirname(stage), { recursive: true });
  copyFileSync(src, stage);

  const result = await extractFlierPage("/uploads/debug-page.jpg");
  console.log(JSON.stringify({ gridRows: result.gridRows, gridCols: result.gridCols }, null, 0));
  for (const item of result.items) {
    console.log(
      `r${item.gridRow ?? "?"} c${item.gridCol ?? "?"} box=${item.box ? [item.box.x0, item.box.y0, item.box.x1, item.box.y1].map((v) => v.toFixed(2)).join(",") : "null"} | ${item.productName}`,
    );
  }
}

main();
