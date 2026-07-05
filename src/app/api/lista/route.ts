import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";
import { compareBasket, MAX_LINES } from "@/lib/basket";
import { getActiveSalesCached, getChainsCached } from "@/lib/sales";

/** Public: compare a pasted shopping list against the active offers. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawLines: unknown = body?.lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return NextResponse.json({ error: "Ngjit së paku një artikull." }, { status: 400 });
  }
  const lines = rawLines
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.slice(0, 80))
    .slice(0, MAX_LINES);

  const [sales, chains] = await Promise.all([getActiveSalesCached({}), getChainsCached()]);
  const results = compareBasket(lines, sales, chains);

  trackEvent("list_compare", {
    items: lines.length,
    chainsMatched: results.length,
    bestCoverage: results[0]?.matched ?? 0,
  });

  return NextResponse.json({ results, lines: lines.length });
}
