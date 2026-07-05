import { createHash } from "node:crypto";

/**
 * Where each chain publishes its fliers publicly. These read the chains' own
 * marketing pages — the same material they distribute in print and on social
 * media. Every import still lands in the review queue; nothing auto-publishes.
 */
export type FlierSource = {
  chainSlug: string;
  /** stable identity of the newest flier at the source, for dedupe */
  sourceKey: string;
  /** either direct page images… */
  imageUrls?: string[];
  /** …or a PDF to be rendered to pages */
  pdfUrl?: string;
};

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; AksioneBot/1.0; +https://www.aksione.com)" };
const MAX_PAGES = 10;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Chains leave old fliers online — a stale import would resurrect last
 * year's prices, so every adapter must prove its source is recent.
 */
const MAX_AGE_DAYS = 21;

function isFresh(date: Date): boolean {
  return Date.now() - date.getTime() < MAX_AGE_DAYS * 86_400_000;
}

/** Viva Fresh publishes the current flier as numbered JPGs on /ofertat/. */
async function vivaFresh(): Promise<FlierSource | null> {
  const html = await fetchText("https://vivafresh-rks.com/ofertat/");
  const all = [...html.matchAll(/src="(https:\/\/vivafresh-rks\.com\/wp-content\/uploads\/(\d{4})\/(\d{2})\/[^"]+-1024x1024\.jpg)"/g)];
  if (all.length === 0) return null;

  // newest upload folder = current flier; must be from this or last month
  const newestFolder = all
    .map((m) => `${m[2]}/${m[3]}`)
    .sort()
    .at(-1)!;
  const [year, month] = newestFolder.split("/").map(Number);
  if (!isFresh(new Date(year, month, 0))) return null; // end of that month

  const imageUrls = [...new Set(all.filter((m) => `${m[2]}/${m[3]}` === newestFolder).map((m) => m[1]))]
    .sort()
    .slice(0, MAX_PAGES);
  if (imageUrls.length === 0) return null;

  return { chainSlug: "viva-fresh", sourceKey: `viva:${hash(imageUrls.join("|"))}`, imageUrls };
}

/** Interex leaflets carry an upload epoch in the file name — newest fresh one wins. */
async function interex(): Promise<FlierSource | null> {
  const html = await fetchText("https://fletushka.interex-rks.com/");
  const stamped = [...html.matchAll(/href="(https:\/\/fletushka\.interex-rks\.com\/uploads\/[^"]*?(\d{10})[^"]*\.pdf)"/g)]
    .map((m) => ({ url: m[1], at: new Date(Number(m[2]) * 1000) }))
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  const newest = stamped[0];
  if (!newest || !isFresh(newest.at)) return null;
  return { chainSlug: "interex", sourceKey: `interex:${hash(newest.url)}`, pdfUrl: newest.url };
}

const SQ_MONTHS: Record<string, number> = {
  janar: 1, shkurt: 2, mars: 3, prill: 4, maj: 5, qershor: 6,
  korrik: 7, gusht: 8, shtator: 9, tetor: 10, nentor: 11, "nëntor": 11, dhjetor: 12,
};

/** Meridian links the current flier PDF from the homepage (wp upload path carries year/month). */
async function meridian(): Promise<FlierSource | null> {
  const html = await fetchText("https://meridianexpress.com/");
  const pdfs = [...html.matchAll(/href="(https:\/\/meridianexpress\.com\/wp-content\/uploads\/(\d{4})\/(\d{2})\/[^"]*[Ff]letushka[^"]*\.pdf)"/g)]
    .map((m) => {
      // "Fletushka-4-qershor-…" names the real publish day — the upload-month
      // fallback alone made a stale flier look fresh until month's end
      const named = /(\d{1,2})-(janar|shkurt|mars|prill|maj|qershor|korrik|gusht|shtator|tetor|n[eë]ntor|dhjetor)/i.exec(m[1]);
      const at = named
        ? new Date(Number(m[2]), SQ_MONTHS[named[2].toLowerCase()] - 1, Number(named[1]))
        : new Date(Number(m[2]), Number(m[3]), 0);
      return { url: m[1], at };
    })
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  const newest = pdfs[0];
  if (!newest || !isFresh(newest.at)) return null;
  return { chainSlug: "meridian-express", sourceKey: `meridian:${hash(newest.url)}`, pdfUrl: newest.url };
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** SPAR publishes date-stamped PDFs on /fletushka/ (ev-brochures/<year>/<month>/). */
async function spar(): Promise<FlierSource | null> {
  const html = await fetchText("https://spar-kosova.com/fletushka/");
  const pdfs = [...html.matchAll(/(?:src|href)="(https?:\/\/spar-kosova\.com\/wp-content\/uploads\/(?:ev-brochures\/)?(\d{4})\/(\w+)\/[^"]+\.pdf)"/g)]
    .map((m) => {
      const month = /^\d+$/.test(m[3]) ? Number(m[3]) : (MONTHS[m[3].toLowerCase()] ?? 0);
      return { url: m[1].replace(/^http:/, "https:"), at: new Date(Number(m[2]), month, 0) };
    })
    .filter((p) => p.at.getFullYear() > 2000)
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  const newest = pdfs[0];
  if (!newest || !isFresh(newest.at)) return null;
  return { chainSlug: "spar", sourceKey: `spar:${hash(newest.url)}`, pdfUrl: newest.url };
}

/** Express Store serves numbered PNG pages under epoch-stamped folders. */
async function expressStore(): Promise<FlierSource | null> {
  const html = await fetchText("https://expressstore-ks.com/fletushka");
  const first = [...html.matchAll(/(?:src|href)="(https:\/\/expressstore-ks\.com\/fletushkat\/(\d{10})\/([fF])1\.png)"/g)]
    .map((m) => ({ folder: m[2], casing: m[3], at: new Date(Number(m[2]) * 1000) }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  if (!first || !isFresh(first.at)) return null;

  // probe consecutive pages until one is missing
  const imageUrls: string[] = [];
  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    const url = `https://expressstore-ks.com/fletushkat/${first.folder}/${first.casing}${pageNo}.png`;
    const head = await fetch(url, { method: "HEAD", headers: HEADERS, signal: AbortSignal.timeout(15_000) });
    if (!head.ok) break;
    imageUrls.push(url);
  }
  if (imageUrls.length === 0) return null;
  return { chainSlug: "express-store", sourceKey: `express:${first.folder}`, imageUrls };
}

/** Albi Market: newest WP upload folder on /ofertat/, like Viva. */
async function albi(): Promise<FlierSource | null> {
  const html = await fetchText("https://albimarket.com/ofertat/");
  const all = [...html.matchAll(/src="(https:\/\/albimarket\.com\/wp-content\/uploads\/(\d{4})\/(\d{2})\/[^"]+-scaled\.jpg)"/g)];
  if (all.length === 0) return null;
  const newestFolder = all.map((m) => `${m[2]}/${m[3]}`).sort().at(-1)!;
  const [year, month] = newestFolder.split("/").map(Number);
  if (!isFresh(new Date(year, month, 0))) return null;
  const imageUrls = [...new Set(all.filter((m) => `${m[2]}/${m[3]}` === newestFolder).map((m) => m[1]))]
    .sort()
    .slice(0, MAX_PAGES);
  if (imageUrls.length === 0) return null;
  return { chainSlug: "albi-market", sourceKey: `albi:${hash(imageUrls.join("|"))}`, imageUrls };
}

// explicit names — minified function names are useless in cron logs
export const FLIER_SOURCE_ADAPTERS: Array<{ name: string; fetch: () => Promise<FlierSource | null> }> = [
  { name: "viva-fresh", fetch: vivaFresh },
  { name: "interex", fetch: interex },
  { name: "meridian-express", fetch: meridian },
  { name: "spar", fetch: spar },
  { name: "express-store", fetch: expressStore },
];

/**
 * Sources whose WAF blocks datacenter IPs — unreachable from Vercel, fetched
 * by the laptop agent (scripts/local-fetch.ts) from a residential IP and
 * uploaded via /api/ingest.
 */
export const LOCAL_FLIER_SOURCE_ADAPTERS: Array<{ name: string; fetch: () => Promise<FlierSource | null> }> = [
  { name: "albi-market", fetch: albi },
];
