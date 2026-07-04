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

/** Meridian links the current flier PDF from the homepage (wp upload path carries year/month). */
async function meridian(): Promise<FlierSource | null> {
  const html = await fetchText("https://meridianexpress.com/");
  const pdfs = [...html.matchAll(/href="(https:\/\/meridianexpress\.com\/wp-content\/uploads\/(\d{4})\/(\d{2})\/[^"]*[Ff]letushka[^"]*\.pdf)"/g)]
    .map((m) => ({ url: m[1], at: new Date(Number(m[2]), Number(m[3]), 0) }))
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  const newest = pdfs[0];
  if (!newest || !isFresh(newest.at)) return null;
  return { chainSlug: "meridian-express", sourceKey: `meridian:${hash(newest.url)}`, pdfUrl: newest.url };
}

export const FLIER_SOURCE_ADAPTERS: Array<() => Promise<FlierSource | null>> = [
  vivaFresh,
  interex,
  meridian,
];
