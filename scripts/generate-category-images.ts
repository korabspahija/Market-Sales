// Generates public/categories/<CATEGORY>.svg — placeholder images used by
// offers published from fliers (until a real product photo is uploaded).
//   npx tsx scripts/generate-category-images.ts

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CATEGORY_META, CATEGORY_ORDER } from "../src/lib/categories";

const OUT_DIR = path.join(process.cwd(), "public", "categories");
mkdirSync(OUT_DIR, { recursive: true });

for (const category of CATEGORY_ORDER) {
  const { emoji, gradient } = CATEGORY_META[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${gradient[0]}"/>
      <stop offset="1" stop-color="${gradient[1]}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="480" fill="url(#g)"/>
  <circle cx="404" cy="76" r="110" fill="#ffffff" opacity="0.25"/>
  <circle cx="60" cy="420" r="130" fill="#ffffff" opacity="0.18"/>
  <text x="240" y="252" font-size="190" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>
`;
  writeFileSync(path.join(OUT_DIR, `${category}.svg`), svg);
  console.log(`✓ ${category}.svg`);
}
