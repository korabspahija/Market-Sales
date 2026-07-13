import { headers } from "next/headers";
import { after } from "next/server";
import { prisma } from "./db";

// crawlers, previews, monitors, scripts — their visits are not demand
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|viber|preview|headless|lighthouse|pingdom|uptime|vercel|curl|wget|python|axios|go-http|okhttp|node-fetch/i;

export function isBotUserAgent(ua: string): boolean {
  return ua.length < 10 || BOT_RE.test(ua);
}

/**
 * Anonymous usage events — the raw material for product decisions now and
 * chain-facing insights later. Never store personal data here (see
 * /privatesia). Server-side events run via after(), so they add zero
 * latency and never break a page.
 */
export type EventType =
  | "search"
  | "filter_use"
  | "offer_view"
  | "flier_view"
  | "flier_list"
  | "chain_page"
  | "list_compare"
  | "share";

export function trackEvent(
  type: EventType,
  data: Record<string, string | number | boolean | string[]>,
): void {
  // read the UA eagerly (request scope), consume it after the response
  const uaPromise = headers()
    .then((h) => h.get("user-agent") ?? "")
    .catch(() => "");
  after(async () => {
    try {
      if (isBotUserAgent(await uaPromise)) return;
      await prisma.event.create({ data: { type, data } });
    } catch {
      // analytics must never take the site down
    }
  });
}
