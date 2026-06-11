import type { Category, SizeUnit } from "../src/generated/prisma/enums";

export const CHAINS = [
  {
    slug: "viva-fresh",
    name: "Viva Fresh Store",
    brandColor: "#00A651",
    darkColor: "#00773A",
    letter: "V",
  },
  {
    slug: "eli-abi",
    name: "Eli-abi",
    brandColor: "#E2001A",
    darkColor: "#9E0012",
    letter: "E",
  },
  {
    slug: "meridian-express",
    name: "Meridian Express",
    brandColor: "#1B75BB",
    darkColor: "#0F4C7C",
    letter: "M",
  },
];

export const MANAGERS = [
  {
    chainSlug: "viva-fresh",
    name: "Arben Krasniqi",
    email: "menaxher.viva@zbritje.app",
    password: "Zbritje2026",
  },
  {
    chainSlug: "eli-abi",
    name: "Elira Gashi",
    email: "menaxher.eliabi@zbritje.app",
    password: "Zbritje2026",
  },
  {
    chainSlug: "meridian-express",
    name: "Driton Berisha",
    email: "menaxher.meridian@zbritje.app",
    password: "Zbritje2026",
  },
];

export const STORES = [
  // Viva Fresh Store
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Bregu i Diellit", city: "Prishtinë", address: "Rr. Eqrem Çabej 32" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Dardania", city: "Prishtinë", address: "Sheshi Bill Klinton" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Prizren", city: "Prizren", address: "Rr. e Tranzitit" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Ferizaj", city: "Ferizaj", address: "Rr. Dëshmorët e Kombit" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Gjakovë", city: "Gjakovë", address: "Rr. Nëna Terezë" },
  // Eli-abi
  { chainSlug: "eli-abi", name: "Eli-abi – Qendra", city: "Prishtinë", address: "Bulevardi Nëna Terezë 21" },
  { chainSlug: "eli-abi", name: "Eli-abi – Mitrovicë", city: "Mitrovicë", address: "Rr. Mbretëresha Teutë" },
  { chainSlug: "eli-abi", name: "Eli-abi – Pejë", city: "Pejë", address: "Rr. Eliot Engel" },
  { chainSlug: "eli-abi", name: "Eli-abi – Gjilan", city: "Gjilan", address: "Rr. Adem Jashari" },
  // Meridian Express
  { chainSlug: "meridian-express", name: "Meridian Express – Ulpiana", city: "Prishtinë", address: "Rr. Imzot Nikë Prela" },
  { chainSlug: "meridian-express", name: "Meridian Express – Fushë Kosovë", city: "Fushë Kosovë", address: "Rr. Nëna Terezë 12" },
  { chainSlug: "meridian-express", name: "Meridian Express – Prizren", city: "Prizren", address: "Rr. Adem Jashari 45" },
  { chainSlug: "meridian-express", name: "Meridian Express – Pejë", city: "Pejë", address: "Rr. Mbretëresha Teutë" },
  { chainSlug: "meridian-express", name: "Meridian Express – Ferizaj", city: "Ferizaj", address: "Rr. Vëllezërit Gërvalla" },
];

export type SeedSale = {
  chainSlug: string;
  name: string;
  emoji: string;
  category: Category;
  sizeValue: number;
  sizeUnit: SizeUnit;
  oldPriceCents: number;
  newPriceCents: number;
  /** offsets in days relative to seed time */
  startsInDays: number;
  endsInDays: number;
};

export const SALES: SeedSale[] = [
  // ─── Viva Fresh Store ───────────────────────────────────────────────
  { chainSlug: "viva-fresh", name: "Ariel detergjent pluhur", emoji: "🧺", category: "HIGJIENE_PASTRIM", sizeValue: 3, sizeUnit: "KG", oldPriceCents: 899, newPriceCents: 599, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "viva-fresh", name: "Domestos pastrues universal", emoji: "🧴", category: "HIGJIENE_PASTRIM", sizeValue: 750, sizeUnit: "ML", oldPriceCents: 249, newPriceCents: 179, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "viva-fresh", name: "Fairy detergjent enësh", emoji: "🧽", category: "HIGJIENE_PASTRIM", sizeValue: 900, sizeUnit: "ML", oldPriceCents: 329, newPriceCents: 239, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "viva-fresh", name: "Qumësht Vita", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 129, newPriceCents: 99, startsInDays: -4, endsInDays: 3 },
  { chainSlug: "viva-fresh", name: "Djathë i bardhë Sharri", emoji: "🧀", category: "BULMET", sizeValue: 800, sizeUnit: "G", oldPriceCents: 549, newPriceCents: 429, startsInDays: -1, endsInDays: 8 },
  { chainSlug: "viva-fresh", name: "Vaj luledielli Floril", emoji: "🌻", category: "USHQIME_BAZE", sizeValue: 1, sizeUnit: "L", oldPriceCents: 189, newPriceCents: 149, startsInDays: -3, endsInDays: 4 },
  { chainSlug: "viva-fresh", name: "Coca-Cola", emoji: "🥤", category: "PIJE", sizeValue: 2, sizeUnit: "L", oldPriceCents: 219, newPriceCents: 169, startsInDays: -5, endsInDays: 2 },
  { chainSlug: "viva-fresh", name: "Mollë Idared", emoji: "🍎", category: "PEME_PERIME", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 89, newPriceCents: 59, startsInDays: -1, endsInDays: 2 },
  // expired — shoppers must never see this
  { chainSlug: "viva-fresh", name: "Nutella krem çokollatë", emoji: "🍫", category: "EMBELSIRA_SNACKS", sizeValue: 750, sizeUnit: "G", oldPriceCents: 699, newPriceCents: 549, startsInDays: -14, endsInDays: -4 },
  // upcoming — visible only to the chain's manager
  { chainSlug: "viva-fresh", name: "Fileto pule e freskët", emoji: "🍗", category: "MISH", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 649, newPriceCents: 499, startsInDays: 3, endsInDays: 10 },

  // ─── Eli-abi ────────────────────────────────────────────────────────
  { chainSlug: "eli-abi", name: "Persil detergjent gel", emoji: "🫧", category: "HIGJIENE_PASTRIM", sizeValue: 2, sizeUnit: "L", oldPriceCents: 949, newPriceCents: 699, startsInDays: -3, endsInDays: 5 },
  { chainSlug: "eli-abi", name: "Qumësht President", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 145, newPriceCents: 115, startsInDays: -2, endsInDays: 7 },
  { chainSlug: "eli-abi", name: "Suxhuk vendi", emoji: "🌭", category: "MISH", sizeValue: 400, sizeUnit: "G", oldPriceCents: 499, newPriceCents: 379, startsInDays: -1, endsInDays: 4 },
  { chainSlug: "eli-abi", name: "Bukë integrale", emoji: "🍞", category: "BUKE_BRUMERA", sizeValue: 500, sizeUnit: "G", oldPriceCents: 99, newPriceCents: 69, startsInDays: -2, endsInDays: 3 },
  { chainSlug: "eli-abi", name: "Jupi lëng portokalli", emoji: "🧃", category: "PIJE", sizeValue: 1.5, sizeUnit: "L", oldPriceCents: 199, newPriceCents: 139, startsInDays: -4, endsInDays: 6 },
  { chainSlug: "eli-abi", name: "Smoki snack kikiriku", emoji: "🥜", category: "EMBELSIRA_SNACKS", sizeValue: 150, sizeUnit: "G", oldPriceCents: 119, newPriceCents: 89, startsInDays: -6, endsInDays: 1 },
  { chainSlug: "eli-abi", name: "Oriz Scotti", emoji: "🍚", category: "USHQIME_BAZE", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 279, newPriceCents: 199, startsInDays: -2, endsInDays: 9 },
  { chainSlug: "eli-abi", name: "Banane", emoji: "🍌", category: "PEME_PERIME", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 139, newPriceCents: 99, startsInDays: -1, endsInDays: 2 },
  // expired
  { chainSlug: "eli-abi", name: "Çaj Franck filterë", emoji: "🍵", category: "PIJE", sizeValue: 40, sizeUnit: "COPE", oldPriceCents: 249, newPriceCents: 179, startsInDays: -12, endsInDays: -2 },
  // upcoming
  { chainSlug: "eli-abi", name: "Akullore vanilje Rugova", emoji: "🍨", category: "EMBELSIRA_SNACKS", sizeValue: 1, sizeUnit: "L", oldPriceCents: 399, newPriceCents: 299, startsInDays: 5, endsInDays: 12 },

  // ─── Meridian Express ───────────────────────────────────────────────
  { chainSlug: "meridian-express", name: "Qumësht Bylmeti", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 135, newPriceCents: 105, startsInDays: -3, endsInDays: 5 },
  { chainSlug: "meridian-express", name: "Vezë të freskëta M", emoji: "🥚", category: "BULMET", sizeValue: 10, sizeUnit: "COPE", oldPriceCents: 229, newPriceCents: 179, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "meridian-express", name: "Mish viçi i grirë", emoji: "🥩", category: "MISH", sizeValue: 500, sizeUnit: "G", oldPriceCents: 449, newPriceCents: 349, startsInDays: -1, endsInDays: 3 },
  { chainSlug: "meridian-express", name: "Domate vendi", emoji: "🍅", category: "PEME_PERIME", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 129, newPriceCents: 89, startsInDays: -1, endsInDays: 2 },
  { chainSlug: "meridian-express", name: "7Days kroasan çokollatë", emoji: "🥐", category: "BUKE_BRUMERA", sizeValue: 110, sizeUnit: "G", oldPriceCents: 79, newPriceCents: 55, startsInDays: -5, endsInDays: 4 },
  { chainSlug: "meridian-express", name: "Ujë Rugove", emoji: "💧", category: "PIJE", sizeValue: 1.5, sizeUnit: "L", oldPriceCents: 69, newPriceCents: 49, startsInDays: -6, endsInDays: 8 },
  { chainSlug: "meridian-express", name: "Shampon Head & Shoulders", emoji: "🧴", category: "HIGJIENE_PASTRIM", sizeValue: 400, sizeUnit: "ML", oldPriceCents: 499, newPriceCents: 349, startsInDays: -2, endsInDays: 7 },
  { chainSlug: "meridian-express", name: "Miell gruri Tipi 500", emoji: "🌾", category: "USHQIME_BAZE", sizeValue: 5, sizeUnit: "KG", oldPriceCents: 429, newPriceCents: 329, startsInDays: -4, endsInDays: 10 },
  { chainSlug: "meridian-express", name: "Kafe Devolli Maxi", emoji: "☕", category: "PIJE", sizeValue: 500, sizeUnit: "G", oldPriceCents: 599, newPriceCents: 479, startsInDays: -3, endsInDays: 5 },
  // expired
  { chainSlug: "meridian-express", name: "Letër tualeti Perla", emoji: "🧻", category: "HIGJIENE_PASTRIM", sizeValue: 16, sizeUnit: "COPE", oldPriceCents: 549, newPriceCents: 399, startsInDays: -10, endsInDays: -3 },
  // upcoming
  { chainSlug: "meridian-express", name: "Kaçkavall Vita", emoji: "🧀", category: "BULMET", sizeValue: 400, sizeUnit: "G", oldPriceCents: 499, newPriceCents: 389, startsInDays: 2, endsInDays: 9 },
];
