import { createHash } from "node:crypto";
import type { Category, SizeUnit } from "@/generated/prisma/enums";

/**
 * Some chains publish their current offers as structured product pages
 * instead of flier images — those import straight into offers with no AI
 * step. Each campaign becomes one (page-less) Flier row for dedupe and
 * validity, its products become Sales directly.
 */
export type ProductCampaign = {
  chainSlug: string;
  sourceKey: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  products: Array<{
    name: string;
    category: Category;
    sizeValue: number;
    sizeUnit: SizeUnit;
    oldPriceCents: number | null;
    newPriceCents: number;
    /** absolute URL of the chain's product photo (re-uploaded at import) */
    imageUrl: string | null;
  }>;
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};
const MAX_PRODUCTS = 80;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/** "1.5 kg" / "750ml" / "2 copë" in a product name -> size; piece otherwise. */
function sizeFromName(name: string): { sizeValue: number; sizeUnit: SizeUnit } {
  const m = /(\d+(?:[.,]\d+)?)\s*(kg|gr?|l|ml|cop[eë])\b/i.exec(name);
  if (!m) return { sizeValue: 1, sizeUnit: "COPE" };
  const value = Number(m[1].replace(",", "."));
  const unit = m[2].toLowerCase();
  const sizeUnit: SizeUnit =
    unit === "kg" ? "KG" : unit === "l" ? "L" : unit === "ml" ? "ML" : unit.startsWith("cop") ? "COPE" : "G";
  return value > 0 ? { sizeValue: value, sizeUnit } : { sizeValue: 1, sizeUnit: "COPE" };
}

function parsePriceCents(text: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)/.exec(text);
  if (!m) return null;
  const cents = Math.round(Number(m[1].replace(",", ".")) * 100);
  return cents > 0 ? cents : null;
}

/** Rough category from the product name; fallback per campaign type. */
function categoryFromName(name: string, fallback: Category): Category {
  const n = name.toLowerCase();
  if (/(mish|viqi|viç|pul[ëe]|gjeli?|muskuj|suxhuk|sallam|proshut|file to|qofte)/.test(n)) return "MISH";
  if (/(qum[ëe]sht|djath|jogurt|kos\b|gjalp|vez[ëe]|ajk[ëe]|maslo)/.test(n)) return "BULMET";
  if (/(moll[ëe]|banane|domate|trangu|speca|qep[ëe]|patate|limon|portokall|pjepr|shalqi|rrush|dredh[ëe]z)/.test(n)) return "PEME_PERIME";
  if (/(buk[ëe]|simite|kifle|brum|petull|tost\b)/.test(n)) return "BUKE_BRUMERA";
  if (/(uj[ëe]|l[ëe]ng|kafe|çaj|caj|cola|pije|birr[ëe]|ver[ëe]\b|energji)/.test(n)) return "PIJE";
  if (/(çokollat|cokollat|k[ëe]mb[ëe]|biskot|çips|cips|snack|karamele|akullore|torte|w?afer)/.test(n)) return "EMBELSIRA_SNACKS";
  if (/(detergjent|shampon|sapun|past[ëe] dh[ëe]mb|let[ëe]r|pelena|omo\b|ariel|persil|fairy)/.test(n)) return "HIGJIENE_PASTRIM";
  return fallback;
}

/**
 * ETC (etc-ks.com): fletushkat.php lists the running campaigns ("Aktualitet
 * Ushqimor 03.07-06.07.2026") linking to aktualiteti.php product grids with
 * name, struck price, discount % and photo per product.
 */
async function etc(): Promise<ProductCampaign[]> {
  const listHtml = await fetchText("https://etc-ks.com/fletushkat.php");

  // campaign card: the aktualiteti link, then the first nearby dated title span
  const campaignRe =
    /href="https:\/\/etc-ks\.com\/aktualiteti\.php\?on=([^"]+)"[\s\S]{0,900}?<span[^>]*>([^<]*?(\d{2})\.(\d{2})(?:-(\d{2})\.(\d{2}))?\.(\d{4})[^<]*)<\/span>/g;
  const seen = new Set<string>();
  const campaigns: ProductCampaign[] = [];
  const now = new Date();

  for (const m of listHtml.matchAll(campaignRe)) {
    const code = m[1];
    if (seen.has(code)) continue;
    seen.add(code);

    const title = m[2].replace(/\s+/g, " ").trim();
    const year = Number(m[7]);
    const startsAt = new Date(year, Number(m[4]) - 1, Number(m[3]));
    // single-date campaigns (daily offers) run just that day
    const endsAt = m[5]
      ? new Date(year, Number(m[6]) - 1, Number(m[5]), 23, 59, 59)
      : new Date(year, Number(m[4]) - 1, Number(m[3]), 23, 59, 59);
    if (endsAt < now || startsAt > new Date(now.getTime() + 7 * 86_400_000)) continue;

    const pageHtml = await fetchText(`https://etc-ks.com/aktualiteti.php?on=${encodeURIComponent(code)}`);

    // non-food campaigns -> "Të tjera"; food ones default to staples
    const category: Category = /jo\s*ushqimor/i.test(title) ? "TJERA" : "USHQIME_BAZE";

    const tileRe =
      /<img[^>]+src="(aktu\/[^"]+)"[\s\S]{0,700}?mod-article-tile__title">([^<]+)<[\s\S]{0,700}?(?:price__previous"\s*>([^<]*)<[\s\S]{0,300}?)?price__main">\s*([\d.,]+)/g;
    const products: ProductCampaign["products"] = [];
    const seenProducts = new Set<string>();
    for (const t of pageHtml.matchAll(tileRe)) {
      if (products.length >= MAX_PRODUCTS) break;
      const name = t[2].replace(/\s+/g, " ").trim();
      const newPriceCents = parsePriceCents(t[4]);
      if (!name || !newPriceCents) continue;
      // the grid repeats featured tiles — one offer per product+price
      const dedupeKey = `${name}|${newPriceCents}|${t[1]}`;
      if (seenProducts.has(dedupeKey)) continue;
      seenProducts.add(dedupeKey);
      const oldPriceCents = t[3] ? parsePriceCents(t[3]) : null;
      products.push({
        name,
        category: categoryFromName(name, category),
        ...sizeFromName(name),
        oldPriceCents: oldPriceCents && oldPriceCents > newPriceCents ? oldPriceCents : null,
        newPriceCents,
        imageUrl: `https://etc-ks.com/${encodeURI(t[1])}`,
      });
    }
    if (products.length === 0) continue;

    campaigns.push({
      chainSlug: "etc",
      sourceKey: `etc:${hash(code + endsAt.toISOString())}`,
      title,
      startsAt,
      endsAt,
      products,
    });
  }
  return campaigns;
}

export const PRODUCT_SOURCE_ADAPTERS: Array<{
  name: string;
  fetch: () => Promise<ProductCampaign[]>;
}> = [{ name: "etc", fetch: etc }];
