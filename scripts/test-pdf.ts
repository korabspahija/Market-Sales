// Dev helper: render a flier PDF to images and report sizes.
//   npx tsx scripts/test-pdf.ts <pdf-url> <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pdfToImages } from "../src/lib/pdf";

async function main() {
  const [, , url, outDir] = process.argv;
  const res = await fetch(url);
  const pdf = Buffer.from(await res.arrayBuffer());
  console.log(`pdf: ${Math.round(pdf.length / 1024)} KB`);
  const started = Date.now();
  const images = await pdfToImages(pdf);
  console.log(`rendered ${images.length} pages in ${Math.round((Date.now() - started) / 1000)}s`);
  mkdirSync(outDir, { recursive: true });
  images.forEach((img, i) => {
    writeFileSync(path.join(outDir, `page-${i + 1}.jpg`), img);
    console.log(`  page ${i + 1}: ${Math.round(img.length / 1024)} KB`);
  });
}

main();
