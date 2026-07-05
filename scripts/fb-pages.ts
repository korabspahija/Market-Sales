// Laptop-only: reads the newest photo posts from chains' PUBLIC Facebook
// pages — logged out, no account involved — using the system Edge browser.
// Chains that only publish fliers on Facebook get imported this way.
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
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

// Quality gate: the first import of a photo wins forever (the perceptual
// dedupe hash is scale-stable), so never let a low-res feed thumbnail claim
// a flier's identity — import only when the theater gave a real copy.
const MIN_BYTES = 40_000;
const MIN_WIDTH = 640;
const MAX_PAGES_PER_POST = 10;
const MAX_POSTS = 2;
// theater visits per handle per run — more looks like scraping and earns
// rate-limited 206px login stubs instead of full-res photos
const MAX_PHOTO_VISITS = 12;

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

type FeedImage = { src: string; href: string | null };

/** Groups sharing any thumbnail URL are the same post across scroll snapshots. */
function mergeGroups(into: FeedImage[][], snapshot: FeedImage[][]) {
  for (const group of snapshot) {
    const hit = into.find((existing) => group.some((img) => existing.some((e) => e.src === img.src)));
    if (hit) {
      for (const img of group) if (!hit.some((e) => e.src === img.src)) hit.push(img);
    } else {
      into.push([...group]);
    }
  }
}

/**
 * The feed serves ~590px previews; the photo page behind each preview (the
 * /photos theater — publicly viewable logged out) carries the original at
 * 1080-2048px. That resolution difference is what makes crops and extraction
 * usable, so it's worth one extra page visit per image.
 */
async function fullResolution(
  context: import("playwright-core").BrowserContext,
  image: FeedImage,
): Promise<string> {
  if (!image.href) return image.src;
  const page = await context.newPage();
  try {
    await page.goto(image.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // human-ish pacing between theater visits
    await page.waitForTimeout(1_800 + Math.floor(Math.random() * 1_500));
    await page.keyboard.press("Escape").catch(() => {});
    const url = (await page.evaluate(`(() => {
      const imgs = [...document.querySelectorAll("img")]
        .filter((img) => img.src.includes("scontent") && !img.src.includes("emoji"));
      imgs.sort((a, b) => (b.naturalWidth || 0) - (a.naturalWidth || 0));
      return imgs[0] ? imgs[0].src : null;
    })()`)) as string | null;
    return url ?? image.src;
  } catch {
    return image.src;
  } finally {
    await page.close();
  }
}

/** Newest big-image posts from one public page, grouped per post. */
async function collectFromPage(
  context: import("playwright-core").BrowserContext,
  handle: string,
): Promise<FeedImage[][]> {
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
      const photoLink = (img) => {
        const anchor = img.closest("a");
        const href = anchor ? anchor.href : null;
        return href && href.includes("photo") ? href : null;
      };
      const collect = (root) => [...root.querySelectorAll("img")]
        .filter((img) => img.src.includes("scontent") && !img.src.includes("emoji"))
        .map((img) => ({ src: best(img), href: photoLink(img) }));

      const articles = [...document.querySelectorAll('[role="article"]')];
      const result = [];
      for (const article of articles) {
        const imgs = collect(article);
        if (imgs.length > 0) result.push(imgs);
      }
      if (result.length === 0) {
        const all = collect(document);
        if (all.length > 0) result.push(all);
      }
      return result;
    })()`;

    const groups: FeedImage[][] = [];
    for (let i = 0; i < 6; i++) {
      mergeGroups(groups, (await page.evaluate(SNAPSHOT)) as FeedImage[][]);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(1_700);
    }
    mergeGroups(groups, (await page.evaluate(SNAPSHOT)) as FeedImage[][]);
    log(`facebook/${handle}: ${groups.length} post group(s), ${groups.reduce((n, g) => n + g.length, 0)} images pre-filter`);
    return groups;
  } finally {
    await page.close();
  }
}

/**
 * Fallback when the feed serves the thin login-walled render: the /photos
 * tab stays public. It loses post grouping, so photos are grouped by fbid
 * proximity — one upload batch (an album) gets near-adjacent ids (~millions
 * apart), unrelated posts differ by hundreds of millions.
 */
async function collectFromPhotosTab(
  context: import("playwright-core").BrowserContext,
  handle: string,
): Promise<FeedImage[][]> {
  const page = await context.newPage();
  try {
    await page.goto(`https://www.facebook.com/${handle}/photos`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(3_000);
    await page.keyboard.press("Escape").catch(() => {});
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(1_400);
    }
    const photos = (await page.evaluate(`(() => {
      const seen = new Set();
      const out = [];
      for (const anchor of document.querySelectorAll('a[href*="photo"]')) {
        const match = anchor.href.match(/fbid=(\\d+)/);
        const img = anchor.querySelector("img");
        if (!match || !img || !img.src.includes("scontent") || seen.has(match[1])) continue;
        seen.add(match[1]);
        out.push({ src: img.src, href: anchor.href, fbid: match[1] });
      }
      return out.slice(0, 14);
    })()`)) as Array<{ src: string; href: string; fbid: string }>;

    const groups: FeedImage[][] = [];
    let previous: number | null = null;
    for (const photo of photos) {
      // fbids stay under 2^53 — plain number math is exact enough here
      const fbid = Number(photo.fbid);
      const sameBatch = previous !== null && Math.abs(fbid - previous) < 100_000_000;
      if (sameBatch && groups.length > 0) groups[groups.length - 1].push({ src: photo.src, href: photo.href });
      else groups.push([{ src: photo.src, href: photo.href }]);
      previous = fbid;
    }
    log(`facebook/${handle}: photos tab gave ${photos.length} photos in ${groups.length} group(s)`);
    return groups;
  } catch (error) {
    log(`facebook/${handle}: photos tab failed — ${error instanceof Error ? error.message : error}`);
    return [];
  } finally {
    await page.close();
  }
}

/** Fliers found on the configured chains' public Facebook pages. */
export async function fetchFacebookFliers(): Promise<FacebookFlier[]> {
  let context: import("playwright-core").BrowserContext;
  try {
    // persistent profile: cookies (consent, datr) survive across runs, so
    // the daily visit looks like a returning browser instead of a fresh bot
    const profileDir = path.join(
      process.env.LOCALAPPDATA ?? os.tmpdir(),
      "aksione-fb-profile",
    );
    context = await chromium.launchPersistentContext(profileDir, {
      channel: "msedge",
      headless: true,
      locale: "sq-AL",
      viewport: { width: 1280, height: 900 },
    });
  } catch (error) {
    log(`facebook: browser launch failed — ${error instanceof Error ? error.message : error}`);
    return [];
  }

  const fliers: FacebookFlier[] = [];
  try {
    for (const { chainSlug, handle } of FB_PAGES) {
      try {
        let groups = await collectFromPage(context, handle);
        // thin login-walled feed render — the /photos tab stays public
        if (groups.reduce((n, g) => n + g.length, 0) < 2) {
          log(`facebook/${handle}: thin feed render, trying the photos tab`);
          groups = await collectFromPhotosTab(context, handle);
        }
        if (groups.length === 0) {
          log(`facebook/${handle}: no post images visible (login wall?)`);
          continue;
        }

        let postsTaken = 0;
        let visits = 0;
        for (const images of groups) {
          if (postsTaken >= MAX_POSTS || visits >= MAX_PHOTO_VISITS) break;
          const pages: Buffer[] = [];
          for (const image of images.slice(0, MAX_PAGES_PER_POST)) {
            try {
              if (image.href) visits++;
              const url = await fullResolution(context, image);
              const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
              if (!res.ok) continue;
              const buffer = Buffer.from(await res.arrayBuffer());
              const meta = await sharp(buffer).metadata();
              if (buffer.length < MIN_BYTES || !meta.width || meta.width < MIN_WIDTH) {
                log(`  skipped image ${buffer.length}B ${meta.width ?? "?"}px`);
                continue;
              }
              log(`  page ${meta.width}x${meta.height ?? "?"} (${Math.round(buffer.length / 1024)}KB)`);
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
    await context.close();
  }
  return fliers;
}
