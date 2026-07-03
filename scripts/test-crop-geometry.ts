// Dev helper: validate panel detection + uniform-grid cropping offline,
// using a captured extraction (no API call).
//   npx tsx scripts/test-crop-geometry.ts <image-path> <outDir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { computeCropRects, detectContentPanel } from "../src/lib/crop";
import type { ExtractedItem } from "../src/lib/extraction";

// captured from scripts/debug-extraction.ts on meridian1.jpg
const CAPTURED: Array<[number, number, [number, number, number, number], string]> = [
  [1, 1, [0.05, 0.08, 0.19, 0.23], "Oriz Dukato"],
  [1, 2, [0.29, 0.08, 0.41, 0.23], "Supe Zogu Maggi"],
  [1, 3, [0.52, 0.08, 0.64, 0.23], "Fasule Emona"],
  [1, 4, [0.75, 0.08, 0.87, 0.23], "Noodles Sun Yan"],
  [2, 1, [0.05, 0.23, 0.19, 0.38], "Biber Besiana"],
  [2, 2, [0.29, 0.23, 0.41, 0.37], "Melmesa Kotanyi"],
  [2, 3, [0.52, 0.23, 0.65, 0.37], "Mjalte Buram"],
  [2, 4, [0.75, 0.23, 0.86, 0.37], "Majonez Thomy"],
  [3, 1, [0.06, 0.38, 0.19, 0.53], "Miser Bonduelle"],
  [3, 2, [0.29, 0.38, 0.41, 0.53], "Tranguj Terra"],
  [3, 3, [0.52, 0.37, 0.64, 0.52], "Feferona Terra"],
  [3, 4, [0.74, 0.37, 0.87, 0.53], "Pashtete Inzersdorfer"],
  [4, 1, [0.05, 0.53, 0.18, 0.67], "Prince Caffe"],
  [4, 2, [0.29, 0.53, 0.41, 0.66], "Nescafe"],
  [4, 3, [0.52, 0.52, 0.65, 0.67], "Uje Jana"],
  [4, 4, [0.75, 0.53, 0.86, 0.67], "Uje Jamnica"],
  [5, 2, [0.29, 0.67, 0.41, 0.82], "Fructal"],
  [5, 3, [0.52, 0.68, 0.64, 0.82], "Leng Frutti"],
  [5, 4, [0.74, 0.68, 0.87, 0.81], "Leng Bravo"],
];

const items: ExtractedItem[] = CAPTURED.map(([gridRow, gridCol, [x0, y0, x1, y1], productName]) => ({
  productName,
  sizeValue: null,
  sizeUnit: null,
  oldPriceEur: null,
  newPriceEur: 1,
  discountPercent: null,
  category: null,
  gridRow,
  gridCol,
  box: { x0, y0, x1, y1 },
}));

async function main() {
  const [, , imagePath, outDir] = process.argv;
  const buffer = readFileSync(imagePath);
  const meta = await sharp(buffer).metadata();
  mkdirSync(outDir, { recursive: true });

  const panel = await detectContentPanel(buffer);
  console.log("panel:", panel ? JSON.stringify(panel) : "NOT DETECTED");

  const rects = await computeCropRects(items, { rows: 6, cols: 4 }, buffer, meta.width!, meta.height!);
  for (let i = 0; i < items.length; i++) {
    const rect = rects[i];
    if (!rect) {
      console.log(`null rect for ${items[i].productName}`);
      continue;
    }
    const out = path.join(outDir, `r${items[i].gridRow}c${items[i].gridCol}.jpg`);
    writeFileSync(out, await sharp(buffer).extract(rect).jpeg({ quality: 82 }).toBuffer());
  }
  console.log("crops written to", outDir);
}

main();
