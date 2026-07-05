import type { Chain } from "@/generated/prisma/client";
import type { SaleWithChain } from "./sales";
import { categoryForWord, expandWord } from "./synonyms";
import { normalizeSearch } from "./text";

/**
 * "Lista ime": match a pasted shopping list against the active offers and
 * rank the chains by how much of the list they cover, then by price.
 * Matching runs in JS over the (cached) active-sales list — a few hundred
 * rows — so it costs nothing.
 */

export const MAX_LINES = 40;

const QUANTITY_RE = /^(x?\d+([.,]\d+)?(l|ml|kg|gr?|cope|cop)?|l|ml|kg|gr?|liter|litra|cope|cop|pako|shishe|kuti)$/i;
const STOP_WORDS = new Set(["dhe", "e", "te", "me", "i", "nje", "per", "a", "o", "the"]);

export type MatchedItem = {
  raw: string;
  sale: {
    id: string;
    productName: string;
    newPriceCents: number;
    oldPriceCents: number;
    sizeValue: number;
    sizeUnit: string;
    imageUrl: string;
  } | null;
};

export type ChainResult = {
  chain: { id: string; name: string; slug: string; logoUrl: string };
  matched: number;
  totalCents: number;
  items: MatchedItem[];
};

/** letters-only tokens of a list line, quantities and filler dropped */
function coreWords(line: string): string[] {
  return normalizeSearch(line)
    .split(/[\s,;.]+/)
    .filter((w) => w.length >= 2 && !QUANTITY_RE.test(w) && !STOP_WORDS.has(w));
}

function trigrams(word: string): Set<string> {
  const padded = `  ${word} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

/** Jaccard similarity of trigram sets — typo tolerance without a DB call. */
function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let shared = 0;
  for (const gram of ta) if (tb.has(gram)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/** How many of the line's words appear in this sale's name (with synonyms + fuzz). */
function matchScore(saleTokens: string[], saleName: string, words: string[]): number {
  let score = 0;
  for (const word of words) {
    const variants = expandWord(word);
    const hit =
      variants.some((v) => saleName.includes(v)) ||
      variants.some((v) => saleTokens.some((token) => similarity(token, v) >= 0.45));
    if (hit) score++;
  }
  return score;
}

export function compareBasket(lines: string[], sales: SaleWithChain[], chains: Chain[]): ChainResult[] {
  const cleaned = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES);
  if (cleaned.length === 0) return [];

  const tokenized = sales.map((sale) => ({
    sale,
    name: sale.searchName,
    tokens: sale.searchName.split(/\s+/).filter((t) => t.length >= 3),
  }));

  // per line, the best offer per chain
  const perLine = cleaned.map((raw) => {
    const words = coreWords(raw);
    const bestPerChain = new Map<string, { sale: SaleWithChain; score: number }>();
    if (words.length === 0) return { raw, bestPerChain };

    // a line that IS a category word ("bylmet") matches the whole category
    const category = words.length === 1 ? categoryForWord(words[0]) : undefined;

    for (const { sale, name, tokens } of tokenized) {
      const score = category
        ? sale.category === category
          ? 1
          : 0
        : matchScore(tokens, name, words);
      if (score === 0) continue;
      const current = bestPerChain.get(sale.chainId);
      if (
        !current ||
        score > current.score ||
        (score === current.score && sale.newPriceCents < current.sale.newPriceCents)
      ) {
        bestPerChain.set(sale.chainId, { sale, score });
      }
    }
    return { raw, bestPerChain };
  });

  const results: ChainResult[] = [];
  for (const chain of chains) {
    const items: MatchedItem[] = perLine.map(({ raw, bestPerChain }) => {
      const best = bestPerChain.get(chain.id);
      return {
        raw,
        sale: best
          ? {
              id: best.sale.id,
              productName: best.sale.productName,
              newPriceCents: best.sale.newPriceCents,
              oldPriceCents: best.sale.oldPriceCents,
              sizeValue: best.sale.sizeValue,
              sizeUnit: best.sale.sizeUnit,
              imageUrl: best.sale.imageUrl,
            }
          : null,
      };
    });
    const matched = items.filter((item) => item.sale).length;
    if (matched === 0) continue;
    results.push({
      chain: { id: chain.id, name: chain.name, slug: chain.slug, logoUrl: chain.logoUrl },
      matched,
      totalCents: items.reduce((sum, item) => sum + (item.sale?.newPriceCents ?? 0), 0),
      items,
    });
  }

  // most of the list covered first; cheaper wins ties
  results.sort((a, b) => b.matched - a.matched || a.totalCents - b.totalCents);
  return results;
}
