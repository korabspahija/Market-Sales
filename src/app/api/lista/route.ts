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

  // the lines themselves are the product: purchase intent per item, and
  // which wishes no chain could serve (assortment gaps)
  const normalizedLines = lines.map((line) => line.trim().toLowerCase().slice(0, 60)).filter(Boolean);
  const unmatched = normalizedLines.filter(
    (_line, index) => !results.some((result) => result.items[index]?.sale),
  );
  trackEvent("list_compare", {
    items: lines.length,
    chainsMatched: results.length,
    bestCoverage: results[0]?.matched ?? 0,
    winner: results[0]?.chain.slug ?? "",
    lines: normalizedLines,
    unmatched,
  });

  return NextResponse.json({ results, lines: lines.length });
}
