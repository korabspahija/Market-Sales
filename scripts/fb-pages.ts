// Laptop-only: reads the newest photo posts from chains' PUBLIC Facebook
// pages — logged out, no account involved — using the system Edge browser.
// Chains that only publish fliers on Facebook get imported this way.
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import sharp from "sharp";

export type FacebookFlier = {
  chainSlug: string;
  sourceKey: string;
  pages: Buffer[];
};

const FB_PAGES: Array<{ chainSlug: string; handle: string }> = [
  { chainSlug: "meridian-express", handle: "RrjetiMeridianExpress" },
  { chainSlug: "albi-market", handle: "AlbiMarket" },
];

// flier pages are big portrait-ish images; avatars/logos/banners are not
// (Albi's album pages render at 472px — keep the floor under that)
const MIN_BYTES = 40_000;
const MIN_WIDTH = 440;
const MAX_PAGES_PER_POST = 10;
const MAX_POSTS = 2;

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/**
 * Content identity that survives Facebook's CDN re-encoding AND re-scaling
 * (the same post renders at 540px one day, 590px the next): a classic
 * average-hash — 8x8 grayscale thresholded by its mean — is stable across
 * both, so a flier only ever imports once.
 */
async function pixelKey(buffer: Buffer): Promise<string> {
  const pixels = await sharp(buffer).resize(8, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const bits = [...pixels].map((p) => (p >= mean ? "1" : "0")).join("");
  return createHash("sha256").update(bits).digest("hex").slice(0, 16);
}

async function dismissDialogs(page: import("playwright-core").Page) {
  // cookie consent, then the login nag — both optional, both best-effort
  for (const label of [/vetëm|decline|refuse|essential/i, /mbyll|close/i]) {
    try {
      const button = page
        .locator('[role="button"], button, [aria-label]')
        .filter({ hasText: label })
        .first();
      await button.click({ timeout: 3_000 });
      await page.waitForTimeout(800);
    } catch {
      try {
        await page.locator('[aria-label="Close"], [aria-label="Mbyll"]').first().click({ timeout: 2_000 });
      } catch {
        // dialog absent — fine
      }
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}

/** Groups sharing any URL are the same post seen across scroll snapshots. */
function mergeGroups(into: string[][], snapshot: string[][]) {
  for (const group of snapshot) {
    const hit = into.find((existing) => group.some((url) => existing.includes(url)));
    if (hit) {
      for (const url of group) if (!hit.includes(url)) hit.push(url);
    } else {
      into.push([...group]);
    }
  }
}

/** Newest big-image posts from one public page, grouped per post. */
async function collectFromPage(
  browser: import("playwright-core").Browser,
  handle: string,
): Promise<string[][]> {
  const context = await browser.newContext({
    locale: "sq-AL",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(`https://www.facebook.com/${handle}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector('img[src*="scontent"]', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2_500);
    await dismissDialogs(page);

    // group feed images by their enclosing post (role=article), preferring
    // the largest srcset variant over the rendered thumbnail. Passed as a
    // string: tsx's esbuild transforms inject helpers (__name) that don't
    // exist inside the browser context. The feed virtualizes, so collect
    // after every scroll and merge the snapshots.
    const SNAPSHOT = `(() => {
      const best = (img) => {
        let url = img.src;
        let bestWidth = 0;
        for (const entry of (img.srcset || "").split(",")) {
          const parts = entry.trim().split(/\\s+/);
          const width = parseInt(parts[1] || "0", 10) || 0;
          if (parts[0] && width > bestWidth) { bestWidth = width; url = parts[0]; }
        }
        return url;
      };
      const collect = (root) => [...root.querySelectorAll("img")]
        .filter((img) => img.src.includes("scontent") && !img.src.includes("emoji"))
        .map(best);

      const articles = [...document.querySelectorAll('[role="article"]')];
      const result = [];
      for (const article of articles) {
        const urls = collect(article);
        if (urls.length > 0) result.push([...new Set(urls)]);
      }
      if (result.length === 0) {
        const all = collect(document);
        if (all.length > 0) result.push([...new Set(all)]);
      }
      return result;
    })()`;

    const groups: string[][] = [];
    for (let i = 0; i < 6; i++) {
      mergeGroups(groups, (await page.evaluate(SNAPSHOT)) as string[][]);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(1_700);
    }
    mergeGroups(groups, (await page.evaluate(SNAPSHOT)) as string[][]);
    log(`facebook/${handle}: ${groups.length} post group(s), ${groups.reduce((n, g) => n + g.length, 0)} images pre-filter`);
    return groups;
  } finally {
    await context.close();
  }
}

/** Fliers found on the configured chains' public Facebook pages. */
export async function fetchFacebookFliers(): Promise<FacebookFlier[]> {
  let browser: import("playwright-core").Browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch (error) {
    log(`facebook: browser launch failed — ${error instanceof Error ? error.message : error}`);
    return [];
  }

  const fliers: FacebookFlier[] = [];
  try {
    for (const { chainSlug, handle } of FB_PAGES) {
      try {
        let groups = await collectFromPage(browser, handle);
        // renders vary run to run — one more try before giving up
        if (groups.reduce((n, g) => n + g.length, 0) < 2) {
          log(`facebook/${handle}: thin render, retrying once`);
          groups = await collectFromPage(browser, handle);
        }
        if (groups.length === 0) {
          log(`facebook/${handle}: no post images visible (login wall?)`);
          continue;
        }

        let postsTaken = 0;
        for (const urls of groups) {
          if (postsTaken >= MAX_POSTS) break;
          const pages: Buffer[] = [];
          for (const url of urls.slice(0, MAX_PAGES_PER_POST)) {
            try {
              const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
              if (!res.ok) continue;
              const buffer = Buffer.from(await res.arrayBuffer());
              const meta = await sharp(buffer).metadata();
              if (buffer.length < MIN_BYTES || !meta.width || meta.width < MIN_WIDTH) {
                log(`  skipped image ${buffer.length}B ${meta.width ?? "?"}px`);
                continue;
              }
              pages.push(buffer);
            } catch {
              // skip unreadable image
            }
          }
          if (pages.length === 0) continue;

          fliers.push({
            chainSlug,
            sourceKey: `fb:${chainSlug}:${await pixelKey(pages[0])}`,
            pages,
          });
          postsTaken++;
        }
        log(`facebook/${handle}: ${postsTaken} candidate post(s)`);
      } catch (error) {
        log(`facebook/${handle}: FAILED — ${error instanceof Error ? error.message : error}`);
      }
    }
  } finally {
    await browser.close();
  }
  return fliers;
}
