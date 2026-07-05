import type { Category } from "@/generated/prisma/enums";

/**
 * Kosovo-dialect and synonym expansion for search. Keys and values are in
 * normalized form (lowercase, ë->e, ç->c — see normalizeSearch). Grown from
 * the zero-result searches in analytics — keep additions normalized.
 */
const SYNONYMS: Record<string, string[]> = {
  // qumësht — Gheg "tamël/tamli"
  tamel: ["qumesht"],
  tambel: ["qumesht"],
  tamli: ["qumesht"],
  tamlit: ["qumesht"],
  qumsht: ["qumesht"],
  qumshti: ["qumesht"],
  uji: ["uje"],
  // gjalpë — Gheg "tlyn", local "masllo"
  tlyn: ["gjalpe"],
  tlyen: ["gjalpe"],
  maslo: ["gjalpe"],
  masllo: ["gjalpe"],
  // vaj — Gheg "voj"
  voj: ["vaj"],
  // vezë — Gheg "voe"
  voe: ["veze"],
  vo: ["veze"],
  // patate — Gheg "kompir"
  kompir: ["patate"],
  kompira: ["patate"],
  kompirat: ["patate"],
  // fasule — Kosovo "pasul"
  pasul: ["fasule", "pasul"],
  pasule: ["fasule", "pasul"],
  // lëng — Gheg "lang"
  lang: ["leng"],
  langje: ["leng"],
  langu: ["leng"],
  // kastravec (Tosk) <-> tranguj (Kosovo)
  kastravec: ["tranguj", "kastravec"],
  kastraveca: ["tranguj", "kastravec"],
  // luleshtrydhe (Tosk) <-> dredhëza (Kosovo)
  luleshtrydhe: ["dredhez", "luleshtrydhe"],
  dredheza: ["dredhez", "luleshtrydhe"],
  dredhza: ["dredhez", "luleshtrydhe"],
  // gjizë kërkohet shpesh bashkë me djathë
  gjize: ["gjize", "djath"],
  gjiza: ["gjize", "djath"],
  // kripë — Gheg "krypë"
  krype: ["kripe"],
  krypa: ["kripe"],
  // domate/tomate
  tomate: ["domate"],
  // banane/banana
  banana: ["banane"],
  // letra higjienike
  letra: ["leter"],
  // pelena — kërkohen si brand
  pampers: ["pelena", "pampers"],
  // çokollatë variante shkrimi
  cokolate: ["cokollat"],
  qokollate: ["cokollat"],
  cokollata: ["cokollat"],
  // detergjent variante
  deterxhent: ["detergjent"],
  detergjenti: ["detergjent"],
};

/** Whole-query words that mean a category, not a product. */
const CATEGORY_WORDS: Record<string, Category> = {
  bylmet: "BULMET",
  bulmet: "BULMET",
  bulmeti: "BULMET",
  bylmeti: "BULMET",
  mish: "MISH",
  mishi: "MISH",
  mishna: "MISH",
  peme: "PEME_PERIME",
  perime: "PEME_PERIME",
  pemet: "PEME_PERIME",
  perimet: "PEME_PERIME",
  fruta: "PEME_PERIME",
  zarzavate: "PEME_PERIME",
  pije: "PIJE",
  pijet: "PIJE",
  embelsira: "EMBELSIRA_SNACKS",
  embelsirat: "EMBELSIRA_SNACKS",
  snacks: "EMBELSIRA_SNACKS",
  higjiene: "HIGJIENE_PASTRIM",
  pastrim: "HIGJIENE_PASTRIM",
  brumera: "BUKE_BRUMERA",
  brumerat: "BUKE_BRUMERA",
  ushqime: "USHQIME_BAZE",
};

export type QueryExpansion = {
  /** search terms to OR together (always includes the original) */
  terms: string[];
  /** set when the query means a whole category */
  category?: Category;
};

/** Expand an already-normalized query into search terms / a category. */
export function expandQuery(qNorm: string): QueryExpansion {
  const trimmed = qNorm.trim();
  if (CATEGORY_WORDS[trimmed]) return { terms: [trimmed], category: CATEGORY_WORDS[trimmed] };

  const terms = new Set<string>([trimmed]);
  for (const expansion of SYNONYMS[trimmed] ?? []) terms.add(expansion);
  // multi-word queries: expand each word too ("qumsht dhile" -> "qumesht")
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    for (const word of words) for (const expansion of SYNONYMS[word] ?? []) terms.add(expansion);
  }
  return { terms: [...terms] };
}

/** Per-word expansions for basket matching (word -> all variants). */
export function expandWord(wordNorm: string): string[] {
  return [wordNorm, ...(SYNONYMS[wordNorm] ?? [])];
}

export function categoryForWord(wordNorm: string): Category | undefined {
  return CATEGORY_WORDS[wordNorm];
}
