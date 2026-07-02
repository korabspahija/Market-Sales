import { readFile } from "node:fs/promises";
import path from "node:path";
import { Category, SizeUnit } from "@/generated/prisma/enums";

export type ExtractedItem = {
  productName: string;
  sizeValue: number | null;
  sizeUnit: SizeUnit | null;
  oldPriceEur: number | null;
  newPriceEur: number;
  category: Category | null;
};

export type ExtractionResult = {
  validFrom: string | null;
  validTo: string | null;
  items: ExtractedItem[];
};

const CATEGORY_VALUES = Object.values(Category);
const UNIT_VALUES = Object.values(SizeUnit);

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["validFrom", "validTo", "items"],
  properties: {
    validFrom: { type: ["string", "null"], description: "Data e fillimit të vlefshmërisë (YYYY-MM-DD) nëse shkruhet në fletushkë" },
    validTo: { type: ["string", "null"], description: "Data e mbarimit të vlefshmërisë (YYYY-MM-DD) nëse shkruhet në fletushkë" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["productName", "sizeValue", "sizeUnit", "oldPriceEur", "newPriceEur", "category"],
        properties: {
          productName: { type: "string", description: "Emri i produktit saktësisht siç shkruhet, me ë/ç" },
          sizeValue: { type: ["number", "null"], description: "Vlera numerike e madhësisë, p.sh. 750 për '750 ml'" },
          sizeUnit: { type: ["string", "null"], enum: [...UNIT_VALUES, null], description: "Njësia: G, KG, ML, L ose COPE" },
          oldPriceEur: { type: ["number", "null"], description: "Çmimi i vjetër/i rregullt në euro nëse shfaqet (p.sh. i vijëzuar)" },
          newPriceEur: { type: "number", description: "Çmimi i ri i ofertës në euro" },
          category: { type: ["string", "null"], enum: [...CATEGORY_VALUES, null] },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Ti nxjerr oferta të strukturuara nga fotot e fletushkave të marketeve të Kosovës.

Rregullat:
- Nxirr VETËM produkte individuale me çmim final të shkruar qartë në euro.
- ANASHKALO: oferta shumëpjesëshe ("2 për 1.50€"), zbritje në përqindje pa çmim final, zbritje për kategori të tëra ("−20% në të gjitha detergjentet").
- Emri i produktit: saktësisht siç shkruhet, me shkronjat ë dhe ç, pa CAPS të panevojshme (Title Case).
- Çmimet me superskript si "1.⁹⁹" lexohen 1.99. Çmimi i vjetër është ai i vijëzuar ose "çmimi i rregullt"; nëse s'ka, vendos null.
- Madhësia nga paketimi: "750 ml" → sizeValue 750, sizeUnit ML; "1 kg" → 1 KG; "10 copë" → 10 COPE; nëse s'ka, null.
- Kategoritë: BULMET (qumësht, djathë, vezë, jogurt), MISH, PEME_PERIME (pemë e perime të freskëta), BUKE_BRUMERA, PIJE (ujë, lëngje, kafe, çaj), EMBELSIRA_SNACKS, HIGJIENE_PASTRIM (detergjentë, kozmetikë, letër), USHQIME_BAZE (miell, oriz, vaj, sheqer, konserva).
- Datat e vlefshmërisë nëse shkruhen diku në faqe (p.sh. "Oferta vlen 12–18 qershor"), formati YYYY-MM-DD.`;

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
        { role: "system", content: SYSTEM_PROMPT },
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
  parsed.items = (parsed.items ?? [])
    .filter((item) => item.productName?.trim() && item.newPriceEur > 0)
    .map((item) => ({
      productName: item.productName.trim().slice(0, 80),
      sizeValue: item.sizeValue && item.sizeValue > 0 ? item.sizeValue : null,
      sizeUnit: item.sizeUnit && UNIT_VALUES.includes(item.sizeUnit) ? item.sizeUnit : null,
      oldPriceEur: item.oldPriceEur && item.oldPriceEur > 0 ? item.oldPriceEur : null,
      newPriceEur: item.newPriceEur,
      category: item.category && CATEGORY_VALUES.includes(item.category) ? item.category : null,
    }));
  return parsed;
}
