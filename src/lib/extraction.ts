import { readFile } from "node:fs/promises";
import path from "node:path";
import { Category, SizeUnit } from "@/generated/prisma/enums";

export type BoundingBox = { x0: number; y0: number; x1: number; y1: number };

export type ExtractedItem = {
  productName: string;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  oldPriceEur: number | null;
  newPriceEur: number;
  discountPercent: number | null;
  category: Category | null;
  /** 1-based grid position when the page is a regular product grid */
  gridRow: number | null;
  gridCol: number | null;
  /** normalized 0..1 box of the product card (photo + name + price) */
  box: BoundingBox | null;
};

export type ExtractionResult = {
  validFrom: string | null;
  validTo: string | null;
  gridRows: number | null;
  gridCols: number | null;
  items: ExtractedItem[];
};

const CATEGORY_VALUES = Object.values(Category);
const UNIT_VALUES = Object.values(SizeUnit);

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["validFrom", "validTo", "gridRows", "gridCols", "items"],
  properties: {
    validFrom: { type: ["string", "null"], description: "Data e fillimit të vlefshmërisë (YYYY-MM-DD) nëse shkruhet në fletushkë" },
    validTo: { type: ["string", "null"], description: "Data e mbarimit të vlefshmërisë (YYYY-MM-DD) nëse shkruhet në fletushkë" },
    gridRows: { type: ["number", "null"], description: "Numri i rreshtave nëse produktet janë në rrjetë të rregullt" },
    gridCols: { type: ["number", "null"], description: "Numri i kolonave nëse produktet janë në rrjetë të rregullt" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["productName", "sizeValue", "sizeUnit", "oldPriceEur", "newPriceEur", "discountPercent", "category", "gridRow", "gridCol", "box"],
        properties: {
          productName: { type: "string", description: "Emri i produktit saktësisht siç shkruhet, me ë/ç" },
          sizeValue: { type: ["number", "null"], description: "Vlera numerike e madhësisë, p.sh. 750 për '750 ml'" },
          sizeUnit: { type: ["string", "null"], enum: [...UNIT_VALUES, null], description: "Njësia: G, KG, ML, L ose COPE" },
          oldPriceEur: { type: ["number", "null"], description: "Çmimi i vjetër/i rregullt në euro nëse shfaqet (p.sh. i vijëzuar)" },
          newPriceEur: { type: "number", description: "Çmimi i ri i ofertës në euro" },
          discountPercent: { type: ["number", "null"], description: "Përqindja e zbritjes siç shkruhet në etiketë, p.sh. 25 për '-25%'" },
          category: { type: ["string", "null"], enum: [...CATEGORY_VALUES, null] },
          gridRow: { type: ["number", "null"], description: "Rreshti i produktit në rrjetë, 1 = më larti" },
          gridCol: { type: ["number", "null"], description: "Kolona e produktit në rrjetë, 1 = më e majta" },
          box: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["x0", "y0", "x1", "y1"],
            description: "Kutia e përafërt e kartës së produktit (foto + emër + çmim), koordinata të normalizuara 0..1",
            properties: {
              x0: { type: "number", description: "skaji i majtë (0..1)" },
              y0: { type: "number", description: "skaji i sipërm (0..1)" },
              x1: { type: "number", description: "skaji i djathtë (0..1)" },
              y1: { type: "number", description: "skaji i poshtëm (0..1)" },
            },
          },
        },
      },
    },
  },
} as const;

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Ti nxjerr oferta të strukturuara nga fotot e fletushkave të marketeve të Kosovës. Sot është ${today}.

Rregullat:
- Nxirr VETËM produkte individuale me çmim final të shkruar qartë në euro.
- ANASHKALO: oferta shumëpjesëshe ("2 për 1.50€"), zbritje në përqindje pa çmim final, zbritje për kategori të tëra ("−20% në të gjitha detergjentet").
- Emri i produktit: kopjoje SAKTËSISHT germë për germë siç shkruhet në tekstin e fletushkës (marka + produkti + varianti). MOS shto, mos hiq e mos "korrigjo" fjalë. Ruaj shkronjat ë dhe ç.
- KUJDES te çmimi i vjetër (i vijëzuari): lexoje shifrën saktë dhe mos e ngatërro me përqindjen e zbritjes. Çmimet me superskript si "1.⁹⁹" lexohen 1.99. Nëse çmimi i vjetër s'shfaqet fare, vendos null.
- Përqindja e zbritjes (p.sh. "-25%") zakonisht shkruhet pranë çmimit — raportoje te discountPercent si numër pozitiv (25). Nëse s'ka, null.
- Madhësia merret nga TEKSTI i rreshtit të produktit (p.sh. "240g", "1.5l", "30 copë"), jo nga fotoja: "750 ml" → sizeValue 750, sizeUnit ML; "1 kg" → 1 KG; "30 copë" → 30 COPE. Nëse madhësia s'shkruhet ose s'lexohet QARTË, vendos null — MOS hamendëso mes kg, litrave a gramëve.
- Kategoritë: BULMET (qumësht, djathë, vezë, jogurt), MISH, PEME_PERIME (pemë e perime të freskëta), BUKE_BRUMERA, PIJE (ujë, lëngje, kafe, çaj), EMBELSIRA_SNACKS, HIGJIENE_PASTRIM (detergjentë, kozmetikë, letër), USHQIME_BAZE (miell, oriz, vaj, sheqer, konserva), TJERA (jo-ushqimore: mobilje, karrige, enë kuzhine, tekstil, vegla, lodra, elektronikë).
- Datat e vlefshmërisë VETËM nëse shkruhen konkretisht në KËTË faqe (p.sh. "Oferta vlen 02–08 korrik"), formati YYYY-MM-DD. Slogane të gjera fushate ("valide deri në shtator") NUK janë data vlefshmërie javore — po s'pati datë të plotë prej–deri, vendos null. Nëse viti nuk shkruhet, supozo vitin që e bën ofertën aktuale ose të ardhshme në raport me sotën — KURRË vit të kaluar.
- RADHA E LISTIMIT është kritike: listo artikujt saktësisht sipas radhës së leximit — nga lart poshtë, dhe brenda çdo rreshti nga e majta në të djathtë. Mos e ndrysho radhën.
- Nëse produktet janë të renditur në rrjetë të rregullt, raporto gridRows dhe gridCols të faqes, dhe për çdo produkt pozicionin gridRow (1 = rreshti më i lartë) e gridCol (1 = kolona më e majtë). Nëse s'ka rrjetë, vendos null.
- Për çdo produkt jep box: kutinë e përafërt që mbulon kartën e tij (fotoja + emri + çmimi), me koordinata të normalizuara 0..1 relative ndaj GJITHË imazhit (x0 majtas, y0 lart, x1 djathtas, y1 poshtë).`;
}

/**
 * Fliers rarely print the year — the model sometimes invents a past one.
 * Deterministically pick the year (last/this/next) that lands the date
 * closest to today, so "02 korrik" in July 2026 becomes 2026-07-02 and a
 * January flier uploaded in late December rolls into the next year.
 */
export function normalizeFlierDate(value: string | null, today = new Date()): string | null {
  if (!value) return null;
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, mm, dd] = match;
  const year = today.getFullYear();
  const candidates = [year - 1, year, year + 1].map((y) => new Date(y, Number(mm) - 1, Number(dd)));
  const best = candidates.reduce((a, b) =>
    Math.abs(a.getTime() - today.getTime()) <= Math.abs(b.getTime() - today.getTime()) ? a : b,
  );
  return `${best.getFullYear()}-${mm}-${dd}`;
}

/** Reads a stored flier page (local /uploads path or public https URL) as an OpenAI image content part. */
async function toImagePart(imageUrl: string): Promise<{ type: "image_url"; image_url: { url: string; detail: "high" } }> {
  if (imageUrl.startsWith("http")) {
    return { type: "image_url", image_url: { url: imageUrl, detail: "high" } };
  }
  const filePath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  const buffer = await readFile(filePath);
  const mime = imageUrl.endsWith(".png") ? "image/png" : imageUrl.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { type: "image_url", image_url: { url: `data:${mime};base64,${buffer.toString("base64")}`, detail: "high" } };
}

export type LayoutRow = { y0: number; y1: number; cards: number };

const LAYOUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rows"],
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["y0", "y1", "cards"],
        properties: {
          y0: { type: "number", description: "ku fillon rreshti vertikalisht (0 = maja e faqes, 1 = fundi)" },
          y1: { type: "number", description: "ku mbaron rreshti vertikalisht (0..1)" },
          cards: { type: "number", description: "sa karta produktesh ka ky rresht" },
        },
      },
    },
  },
} as const;

/**
 * Second, structure-only pass: every horizontal row of product cards with
 * its own card count (mixed layouts like a 5-card fruit row above 4-card
 * dairy rows are common). Counting cards in one band is a task vision
 * models get right; exact pixel positions come from the pixels afterwards.
 */
export async function analyzePageLayout(imageUrl: string): Promise<LayoutRow[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `Analizo STRUKTURËN e një faqeje fletushke marketi. Listo çdo RRESHT horizontal kartash produktesh nga lart poshtë. Për çdo rresht jep: y0 dhe y1 (ku fillon e mbaron rreshti vertikalisht në faqe, 0 = maja, 1 = fundi) dhe cards = sa karta produktesh ka AI RRESHT (numëroji me kujdes një nga një — rreshtat e ndryshëm shpesh kanë numër të ndryshëm kartash). Karta = kuti me produkt + çmim. Anashkalo header, tituj, banera e footer. Faqe pa karta produktesh = rows bosh.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analizo strukturën e kësaj faqeje." },
            await toImagePart(imageUrl),
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "page_layout", strict: true, schema: LAYOUT_SCHEMA },
      },
    }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { rows: LayoutRow[] };
    const rows = (parsed.rows ?? [])
      .filter((r) => r.y0 >= 0 && r.y1 <= 1 && r.y1 - r.y0 >= 0.04 && r.cards >= 1 && r.cards <= 8)
      .sort((a, b) => a.y0 - b.y0);
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

export async function extractFlierPage(imageUrl: string): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY mungon — vendose në environment që të funksionojë leximi i fletushkave.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      max_tokens: 8000,
      messages: [
        { role: "system", content: systemPrompt() },
        {
          role: "user",
          content: [
            { type: "text", text: "Nxirr të gjitha ofertat nga kjo faqe fletushke." },
            await toImagePart(imageUrl),
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "flier_extraction", strict: true, schema: RESPONSE_SCHEMA },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ktheu gabim ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI nuk ktheu përmbajtje.");

  const parsed = JSON.parse(content) as ExtractionResult;
  // defensive normalization — never trust model output blindly
  parsed.validFrom = normalizeFlierDate(parsed.validFrom);
  parsed.validTo = normalizeFlierDate(parsed.validTo);
  if (parsed.validFrom && parsed.validTo && parsed.validTo < parsed.validFrom) {
    // Dec -> Jan spanning flier: roll the end date into the next year
    const [y, m, d] = parsed.validTo.split("-");
    parsed.validTo = `${Number(y) + 1}-${m}-${d}`;
  }
  parsed.items = (parsed.items ?? [])
    .filter((item) => item.productName?.trim() && item.newPriceEur > 0)
    .map((item) => {
      const discountPercent =
        item.discountPercent && item.discountPercent >= 1 && item.discountPercent <= 95
          ? Math.round(item.discountPercent)
          : null;
      let oldPriceEur = item.oldPriceEur && item.oldPriceEur > 0 ? item.oldPriceEur : null;
      // old price unreadable but the % badge is big and clear: derive a prefill
      if (!oldPriceEur && discountPercent) {
        oldPriceEur = Math.round((item.newPriceEur / (1 - discountPercent / 100)) * 100) / 100;
      }
      const box =
        item.box &&
        [item.box.x0, item.box.y0, item.box.x1, item.box.y1].every((v) => v >= 0 && v <= 1) &&
        item.box.x1 > item.box.x0 &&
        item.box.y1 > item.box.y0
          ? item.box
          : null;
      return {
        productName: item.productName.trim().slice(0, 80),
        sizeValue: item.sizeValue && item.sizeValue > 0 ? item.sizeValue : null,
        sizeUnit: item.sizeUnit && UNIT_VALUES.includes(item.sizeUnit) ? item.sizeUnit : null,
        oldPriceEur,
        newPriceEur: item.newPriceEur,
        discountPercent,
        category: item.category && CATEGORY_VALUES.includes(item.category) ? item.category : null,
        gridRow: item.gridRow && item.gridRow >= 1 && item.gridRow <= 30 ? Math.round(item.gridRow) : null,
        gridCol: item.gridCol && item.gridCol >= 1 && item.gridCol <= 15 ? Math.round(item.gridCol) : null,
        box,
      };
    });
  return parsed;
}
