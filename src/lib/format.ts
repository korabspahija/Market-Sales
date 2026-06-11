import type { SizeUnit } from "@/generated/prisma/enums";

const euro = new Intl.NumberFormat("sq", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const number = new Intl.NumberFormat("sq", { maximumFractionDigits: 2 });

export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("sq", { day: "numeric", month: "long" }).format(date);
}

export function formatDateFull(date: Date): string {
  return new Intl.DateTimeFormat("sq", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export const UNIT_LABELS: Record<SizeUnit, string> = {
  G: "g",
  KG: "kg",
  ML: "ml",
  L: "L",
  COPE: "copë",
};

export function formatSize(value: number, unit: SizeUnit): string {
  return `${number.format(value)} ${UNIT_LABELS[unit]}`;
}

export function discountPercent(oldCents: number, newCents: number): number {
  return Math.round(((oldCents - newCents) / oldCents) * 100);
}

/** Price per base unit: €/kg for G+KG, €/L for ML+L, €/copë for COPE. */
export function formatUnitPrice(newCents: number, sizeValue: number, unit: SizeUnit): string {
  if (sizeValue <= 0) return "";
  let baseQty: number;
  let baseLabel: string;
  switch (unit) {
    case "G":
      baseQty = sizeValue / 1000;
      baseLabel = "kg";
      break;
    case "KG":
      baseQty = sizeValue;
      baseLabel = "kg";
      break;
    case "ML":
      baseQty = sizeValue / 1000;
      baseLabel = "L";
      break;
    case "L":
      baseQty = sizeValue;
      baseLabel = "L";
      break;
    case "COPE":
      baseQty = sizeValue;
      baseLabel = "copë";
      break;
  }
  return `${euro.format(newCents / 100 / baseQty)}/${baseLabel}`;
}

/** "Edhe X ditë" / "Skadon sot" style validity label for active sales. */
export function validityLabel(endsAt: Date, now = new Date()): string {
  const ms = endsAt.getTime() - now.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "Skadon sot";
  if (days === 1) return "Edhe 1 ditë";
  return `Edhe ${days} ditë`;
}
