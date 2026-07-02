import { z } from "zod";
import { Category, SizeUnit } from "@/generated/prisma/enums";

/** "8.99" / "8,99" -> 899 cents */
const priceToCents = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, "Çmimi duhet të jetë numër, p.sh. 4.99")
  .transform((value) => Math.round(parseFloat(value.replace(",", ".")) * 100))
  .refine((cents) => cents > 0, "Çmimi duhet të jetë më i madh se zero.");

/** "2026-06-15" from <input type="date"> */
const dateInput = z.iso.date("Data nuk është e vlefshme.");

export const saleInputSchema = z
  .object({
    productName: z
      .string()
      .trim()
      .min(2, "Emri i produktit duhet të ketë së paku 2 shkronja.")
      .max(80, "Emri i produktit është shumë i gjatë."),
    category: z.enum(Category, { error: "Zgjidh një kategori." }),
    sizeValue: z.coerce
      .number({ error: "Madhësia duhet të jetë numër." })
      .positive("Madhësia duhet të jetë më e madhe se zero."),
    sizeUnit: z.enum(SizeUnit, { error: "Zgjidh njësinë." }),
    oldPrice: priceToCents,
    newPrice: priceToCents,
    startDate: dateInput,
    endDate: dateInput,
  })
  .refine((data) => data.newPrice < data.oldPrice, {
    message: "Çmimi i ri duhet të jetë më i ulët se çmimi i vjetër.",
    path: ["newPrice"],
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Data e mbarimit duhet të jetë pas datës së fillimit.",
    path: ["endDate"],
  });

export type SaleInput = z.infer<typeof saleInputSchema>;

/** Sale runs from 00:00 of startDate until 23:59:59 of endDate (server-local time). */
export function saleDateRange(input: Pick<SaleInput, "startDate" | "endDate">) {
  const [sy, sm, sd] = input.startDate.split("-").map(Number);
  const [ey, em, ed] = input.endDate.split("-").map(Number);
  return {
    startsAt: new Date(sy, sm - 1, sd, 0, 0, 0),
    endsAt: new Date(ey, em - 1, ed, 23, 59, 59, 999),
  };
}

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Të dhënat nuk janë të vlefshme.";
}

/** One reviewed row from the flier validation table. */
const draftRowSchema = z
  .object({
    draftId: z.string().min(1),
    productName: z
      .string()
      .trim()
      .min(2, "Emri i produktit duhet të ketë së paku 2 shkronja.")
      .max(80, "Emri i produktit është shumë i gjatë."),
    category: z.enum(Category, { error: "Zgjidh kategorinë për çdo artikull të zgjedhur." }),
    sizeValue: z.coerce
      .number({ error: "Madhësia duhet të jetë numër." })
      .positive("Madhësia duhet të jetë më e madhe se zero."),
    sizeUnit: z.enum(SizeUnit, { error: "Zgjidh njësinë për çdo artikull të zgjedhur." }),
    oldPrice: priceToCents,
    newPrice: priceToCents,
  })
  .refine((row) => row.newPrice < row.oldPrice, {
    message: "Çmimi i ri duhet të jetë më i ulët se çmimi i vjetër.",
    path: ["newPrice"],
  });

export const flierPublishSchema = z
  .object({
    startDate: dateInput,
    endDate: dateInput,
    publish: z.array(draftRowSchema).max(200),
    discardIds: z.array(z.string().min(1)).max(500),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Data e mbarimit duhet të jetë pas datës së fillimit.",
    path: ["endDate"],
  });

export type FlierPublishInput = z.infer<typeof flierPublishSchema>;
