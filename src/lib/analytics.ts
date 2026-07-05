import { after } from "next/server";
import { prisma } from "./db";

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
  | "share";

export function trackEvent(type: EventType, data: Record<string, string | number | boolean>): void {
  after(async () => {
    try {
      await prisma.event.create({ data: { type, data } });
    } catch {
      // analytics must never take the site down
    }
  });
}
