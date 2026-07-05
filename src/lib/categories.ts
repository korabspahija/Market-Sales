import type { Category } from "@/generated/prisma/enums";

export const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; gradient: [string, string] }
> = {
  BULMET: { label: "Bulmet & Vezë", emoji: "🥛", gradient: ["#E3F2FD", "#BBDEFB"] },
  MISH: { label: "Mish", emoji: "🥩", gradient: ["#FFEBEE", "#FFCDD2"] },
  PEME_PERIME: { label: "Pemë & Perime", emoji: "🍎", gradient: ["#E8F5E9", "#C8E6C9"] },
  BUKE_BRUMERA: { label: "Bukë & Brumëra", emoji: "🥖", gradient: ["#FFF8E1", "#FFECB3"] },
  PIJE: { label: "Pije", emoji: "🥤", gradient: ["#E0F7FA", "#B2EBF2"] },
  EMBELSIRA_SNACKS: { label: "Ëmbëlsira & Snacks", emoji: "🍫", gradient: ["#FCE4EC", "#F8BBD0"] },
  HIGJIENE_PASTRIM: { label: "Higjienë & Pastrim", emoji: "🧴", gradient: ["#E8EAF6", "#C5CAE9"] },
  USHQIME_BAZE: { label: "Ushqime bazë", emoji: "🛒", gradient: ["#FFF3E0", "#FFE0B2"] },
  TJERA: { label: "Të tjera", emoji: "🪑", gradient: ["#F3E5F5", "#E1BEE7"] },
};

export const CATEGORY_ORDER: Category[] = [
  "BULMET",
  "MISH",
  "PEME_PERIME",
  "BUKE_BRUMERA",
  "PIJE",
  "EMBELSIRA_SNACKS",
  "HIGJIENE_PASTRIM",
  "USHQIME_BAZE",
  "TJERA",
];
