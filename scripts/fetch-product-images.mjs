// Downloads real product photos from Open Food Facts (community database,
// images CC-BY-SA) into public/products/<slug>.jpg. Products without a hit
// keep their generated SVG placeholder. Re-runnable: existing files are skipped.
//
//   node scripts/fetch-product-images.mjs [--force]
//
// OFF's search API allows ~10 req/min, so requests are paced and 503s retried.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// slug (matches prisma/seed-data.ts product slugs) -> { q: search terms, brand?: brand tag }
// Fresh produce / local-only items are deliberately absent.
const QUERIES = {
  "ariel-detergjent-pluhur": { q: "ariel", brand: "ariel" },
  "domestos-pastrues-universal": { q: "domestos javel", brand: "domestos" },
  "fairy-detergjent-enesh": { q: "fairy liquide vaisselle", brand: "fairy" },
  "qumesht-vita": { q: "qumesht", brand: "vita" },
  "vaj-luledielli-floril": { q: "vaj luledielli", brand: "floril" },
  "coca-cola": { q: "coca cola original 2l", brand: "coca-cola" },
  "nutella-krem-cokollate": { q: "nutella pate a tartiner", brand: "nutella" },
  "persil-detergjent-gel": { q: "persil", brand: "persil" },
  "qumesht-president": { q: "lait", brand: "president" },
  "jupi-leng-portokalli": { q: "jupi", brand: "jupi" },
  "smoki-snack-kikiriku": { q: "smoki", brand: "smoki" },
  "oriz-scotti": { q: "riso", brand: "scotti" },
  "caj-franck-filtere": { q: "caj", brand: "franck" },
  "qumesht-bylmeti": { q: "qumesht i fresket", brand: "bylmeti" },
  "7days-kroasan-cokollate": { q: "croissant cocoa", brand: "7days" },
  "uje-rugove": { q: "uje natyral", brand: "rugove" },
  "shampon-head-shoulders": { q: "shampoo classic", brand: "head-shoulders" },
  "kafe-devolli-maxi": { q: "kafe", brand: "devolli" },
  "kafe-devolli-e-bluar": { q: "coffee", brand: "devolli" },
  "milka-cokollate-qumeshti": { q: "alpine milk chocolate", brand: "milka" },
  "jacobs-kronung-kafe-e-bluar": { q: "kronung", brand: "jacobs" },
  "podravka-ajvar-i-bute": { q: "ajvar", brand: "podravka" },
  "barilla-makarona-penne": { q: "penne rigate", brand: "barilla" },
  "somat-tableta-per-enelarese": { q: "somat", brand: "somat" },
  "pampers-pelena-nr-4": { q: "pampers", brand: "pampers" },
  "kinder-bueno-multipack": { q: "kinder bueno", brand: "kinder" },
  "qumesht-meggle": { q: "mlijeko", brand: "meggle" },
  "djathe-i-fresket-vita": { q: "djathe", brand: "vita" },
  "pestova-cipsa": { q: "chips", brand: "vipa" },
  "uje-dea-pako": { q: "uje", brand: "dea" },
  "ace-zbardhues": { q: "ace", brand: "ace" },
  "cokollate-snickers-pako": { q: "snickers", brand: "snickers" },
  "vaj-ulliri-ekstra-i-virgjer": { q: "huile d'olive vierge extra", brand: "" },
  "spar-qumesht-i-fresket": { q: "milch", brand: "spar" },
  "spar-buke-toast": { q: "toast", brand: "spar" },
  "lavazza-qualita-oro": { q: "qualita oro", brand: "lavazza" },
  "dove-sapun-krem": { q: "dove soap", brand: "dove" },
  "spar-oriz-parboiled": { q: "parboiled reis", brand: "spar" },
  "djathe-i-bardhe-sharri": { q: "djathe i bardhe", brand: "sharri" },
  "akullore-vanilje-rugova": { q: "akullore", brand: "" },
  "leter-tualeti-perla": { q: "toilet paper", brand: "perla" },
};

const FORCE = process.argv.includes("--force");
const OUT_DIR = path.join(process.cwd(), "public", "products");
mkdirSync(OUT_DIR, { recursive: true });

const headers = { "User-Agent": "AksioneSeed/1.0 (demo data; aksione.com)" };
const PACE_MS = 6500;
let ok = 0;
let miss = 0;

async function searchWithRetry(url, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    if (res.status !== 503 && res.status !== 429) throw new Error(`search http ${res.status}`);
    console.log(`  …rate limited (${res.status}), waiting 25s`);
    await new Promise((resolve) => setTimeout(resolve, 25_000));
  }
  throw new Error("rate limited after retries");
}

for (const [slug, { q, brand }] of Object.entries(QUERIES)) {
  const dest = path.join(OUT_DIR, `${slug}.jpg`);
  if (!FORCE && existsSync(dest)) {
    console.log(`= ${slug} (exists)`);
    ok++;
    continue;
  }
  try {
    let searchUrl =
      "https://world.openfoodfacts.org/cgi/search.pl?action=process&search_simple=1&json=1&page_size=10" +
      `&fields=product_name,brands,image_front_url&search_terms=${encodeURIComponent(q)}`;
    if (brand) {
      searchUrl += `&tagtype_0=brands&tag_contains_0=contains&tag_0=${encodeURIComponent(brand)}`;
    }
    const data = await searchWithRetry(searchUrl);
    const candidates = (data.products ?? []).filter((p) => p.image_front_url);
    const brandWord = brand.replace(/-/g, " ").split(" ")[0];
    const hit =
      candidates.find((p) => brandWord && (p.brands ?? "").toLowerCase().includes(brandWord)) ??
      candidates[0];
    if (!hit) throw new Error("no image in results");

    const img = await fetch(hit.image_front_url, { headers });
    if (!img.ok) throw new Error(`image http ${img.status}`);
    const buffer = Buffer.from(await img.arrayBuffer());
    if (buffer.length < 2000) throw new Error("image too small");

    writeFileSync(dest, buffer);
    ok++;
    console.log(`✓ ${slug}  <-  ${hit.product_name ?? "?"} [${hit.brands ?? "?"}] (${Math.round(buffer.length / 1024)} KB)`);
  } catch (error) {
    miss++;
    console.log(`✗ ${slug} (${q}): ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, PACE_MS));
}

console.log(`\n${ok} photos, ${miss} misses (misses keep their SVG placeholder)`);
