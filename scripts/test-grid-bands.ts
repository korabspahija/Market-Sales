// Dev helper: pixel-only grid detection check (no API).
//   npx tsx scripts/test-grid-bands.ts <image-path> [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { detectContentPanel, detectGridBands, detectPageCardBands } from "../src/lib/crop";

async function main() {
  const [, , imagePath, outDir] = process.argv;
  const buffer = readFileSync(imagePath);
  const panel = await detectContentPanel(buffer);
  console.log("panel:", panel ? Object.values(panel).map((v) => v.toFixed(3)).join(",") : "NOT DETECTED");
  let bands = panel ? await detectGridBands(buffer, panel) : null;
  if (bands) console.log("mode: panel grid");
  if (!bands) {
    bands = await detectPageCardBands(buffer, panel);
    if (bands) console.log("mode: page card bands");
  }
  if (!bands) {
    console.log("grid: NOT DETECTED (irregular page)");
    return;
  }
  console.log(`grid: ${bands.rowBands.length} rows x ${bands.colBands.length} cols`);

  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    const meta = await sharp(buffer).metadata();
    for (let r = 0; r < bands.rowBands.length; r++) {
      for (let c = 0; c < bands.colBands.length; c++) {
        const y = bands.rowBands[r];
        const x = bands.colBands[c];
        const rect = {
          left: Math.round(x[0] * meta.width!),
          top: Math.round(y[0] * meta.height!),
          width: Math.round((x[1] - x[0]) * meta.width!),
          height: Math.round((y[1] - y[0]) * meta.height!),
        };
        writeFileSync(
          path.join(outDir, `r${r + 1}c${c + 1}.jpg`),
          await sharp(buffer).extract(rect).jpeg({ quality: 82 }).toBuffer(),
        );
      }
    }
    console.log("cell crops written to", outDir);
  }
}

main();
