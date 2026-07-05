import type { Category, SizeUnit } from "../src/generated/prisma/enums";

export const MANAGER_PASSWORD = "Aksione2026";

export type SeedChain = {
  slug: string;
  name: string;
  brandColor: string;
  darkColor: string;
  letter: string;
  /** real logo file under public/brands/ — falls back to a generated lettermark when absent */
  logoFile?: string;
};

export const CHAINS: SeedChain[] = [
  { slug: "viva-fresh", name: "Viva Fresh Store", brandColor: "#D71920", darkColor: "#9E0012", letter: "V", logoFile: "viva-fresh.png" },
  { slug: "eli-abi", name: "Eli-abi", brandColor: "#E2001A", darkColor: "#9E0012", letter: "E" },
  { slug: "meridian-express", name: "Meridian Express", brandColor: "#F7941D", darkColor: "#C26800", letter: "M", logoFile: "meridian-express.png" },
  { slug: "etc", name: "ETC", brandColor: "#1B3F94", darkColor: "#122A63", letter: "E", logoFile: "etc.png" },
  { slug: "interex", name: "Interex", brandColor: "#E30613", darkColor: "#A1040D", letter: "I", logoFile: "interex.svg" },
  { slug: "albi-market", name: "Albi Market", brandColor: "#E2001A", darkColor: "#9E0012", letter: "A", logoFile: "albi-market.png" },
  { slug: "spar", name: "SPAR Kosova", brandColor: "#006633", darkColor: "#004422", letter: "S", logoFile: "spar.png" },
  { slug: "express-store", name: "Express Store", brandColor: "#E95D0F", darkColor: "#B34305", letter: "E", logoFile: "express-store.png" },
];

export const MANAGERS = [
  { chainSlug: "viva-fresh", name: "Arben Krasniqi", email: "menaxher.viva@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "eli-abi", name: "Elira Gashi", email: "menaxher.eliabi@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "meridian-express", name: "Driton Berisha", email: "menaxher.meridian@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "etc", name: "Lulzim Morina", email: "menaxher.etc@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "interex", name: "Vjosa Hoxha", email: "menaxher.interex@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "albi-market", name: "Blerim Shala", email: "menaxher.albi@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "spar", name: "Donika Rexhepi", email: "menaxher.spar@aksione.com", password: MANAGER_PASSWORD },
  { chainSlug: "express-store", name: "Menaxheri Express", email: "menaxher.express@aksione.com", password: MANAGER_PASSWORD },
];

export const STORES = [
  // Viva Fresh Store (largest chain in Kosovo — 100+ stores; a representative subset)
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Bregu i Diellit", city: "Prishtinë", address: "Rr. Eqrem Çabej 32" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Dardania", city: "Prishtinë", address: "Sheshi Bill Klinton" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Ulpiana", city: "Prishtinë", address: "Rr. Sylejman Vokshi" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Prizren", city: "Prizren", address: "Rr. e Tranzitit" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Ferizaj", city: "Ferizaj", address: "Rr. Dëshmorët e Kombit" },
  { chainSlug: "viva-fresh", name: "Viva Fresh Store – Gjakovë", city: "Gjakovë", address: "Rr. Nëna Terezë" },
  // Eli-abi
  { chainSlug: "eli-abi", name: "Eli-abi – Qendra", city: "Prishtinë", address: "Bulevardi Nëna Terezë 21" },
  { chainSlug: "eli-abi", name: "Eli-abi – Mitrovicë", city: "Mitrovicë", address: "Rr. Mbretëresha Teutë" },
  { chainSlug: "eli-abi", name: "Eli-abi – Pejë", city: "Pejë", address: "Rr. Eliot Engel" },
  { chainSlug: "eli-abi", name: "Eli-abi – Gjilan", city: "Gjilan", address: "Rr. Adem Jashari" },
  // Meridian Express (38 stores in 8 cities)
  { chainSlug: "meridian-express", name: "Meridian Express – Ulpiana", city: "Prishtinë", address: "Rr. Imzot Nikë Prela" },
  { chainSlug: "meridian-express", name: "Meridian Express – Aktash", city: "Prishtinë", address: "Rr. Agim Ramadani" },
  { chainSlug: "meridian-express", name: "Meridian Express – Fushë Kosovë", city: "Fushë Kosovë", address: "Rr. Nëna Terezë 12" },
  { chainSlug: "meridian-express", name: "Meridian Express – Prizren", city: "Prizren", address: "Rr. Adem Jashari 45" },
  { chainSlug: "meridian-express", name: "Meridian Express – Pejë", city: "Pejë", address: "Rr. Mbretëresha Teutë" },
  { chainSlug: "meridian-express", name: "Meridian Express – Ferizaj", city: "Ferizaj", address: "Rr. Vëllezërit Gërvalla" },
  // ETC — Elkos Trading Center (origin Pejë, present in all major cities)
  { chainSlug: "etc", name: "ETC – Pejë", city: "Pejë", address: "Rr. Adem Jashari" },
  { chainSlug: "etc", name: "ETC – Prishtinë", city: "Prishtinë", address: "Magjistralja Prishtinë–Ferizaj, Veternik" },
  { chainSlug: "etc", name: "ETC – Prizren", city: "Prizren", address: "Rr. Tirana" },
  { chainSlug: "etc", name: "ETC – Gjakovë", city: "Gjakovë", address: "Rr. Tivari" },
  { chainSlug: "etc", name: "ETC – Mitrovicë", city: "Mitrovicë", address: "Rr. Shemsi Ahmeti" },
  { chainSlug: "etc", name: "ETC – Ferizaj", city: "Ferizaj", address: "Rr. Enver Topalli" },
  // Interex
  { chainSlug: "interex", name: "Interex – Prishtinë", city: "Prishtinë", address: "Rr. Fehmi Lladrovci 32" },
  { chainSlug: "interex", name: "Interex – Bregu i Diellit", city: "Prishtinë", address: "Rr. Llapi" },
  { chainSlug: "interex", name: "Interex – Fushë Kosovë", city: "Fushë Kosovë", address: "Magjistralja Prishtinë–Pejë" },
  { chainSlug: "interex", name: "Interex – Skenderaj", city: "Skenderaj", address: "Sheshi Adem Jashari" },
  // Albi Market (40+ locations)
  { chainSlug: "albi-market", name: "Albi Market – Vicianum", city: "Prishtinë", address: "Rr. Viciana" },
  { chainSlug: "albi-market", name: "Albi Market – Mati 1", city: "Prishtinë", address: "Rr. Muharrem Fejza" },
  { chainSlug: "albi-market", name: "Albi Market – Prizren", city: "Prizren", address: "Rr. De Rada" },
  { chainSlug: "albi-market", name: "Albi Market – Gjilan", city: "Gjilan", address: "Rr. Idriz Seferi" },
  { chainSlug: "albi-market", name: "Albi Market – Podujevë", city: "Podujevë", address: "Rr. Zahir Pajaziti" },
  // SPAR Kosova (division of Meridian Corporation)
  { chainSlug: "spar", name: "SPAR – Çagllavicë", city: "Prishtinë", address: "Magjistralja Prishtinë–Ferizaj" },
  { chainSlug: "spar", name: "SPAR – Qendra", city: "Prishtinë", address: "Rr. Luan Haradinaj" },
  { chainSlug: "spar", name: "SPAR – Graçanicë", city: "Graçanicë", address: "Rr. Car Llazari" },
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

  // ─── ETC (Elkos distributes Ferrero, Mondelez, Henkel, Podravka…) ───
  { chainSlug: "etc", name: "Nutella krem çokollatë", emoji: "🍫", category: "EMBELSIRA_SNACKS", sizeValue: 600, sizeUnit: "G", oldPriceCents: 599, newPriceCents: 469, startsInDays: -2, endsInDays: 5 },
  { chainSlug: "etc", name: "Milka çokollatë qumështi", emoji: "🍫", category: "EMBELSIRA_SNACKS", sizeValue: 270, sizeUnit: "G", oldPriceCents: 299, newPriceCents: 199, startsInDays: -3, endsInDays: 4 },
  { chainSlug: "etc", name: "Jacobs Krönung kafe e bluar", emoji: "☕", category: "PIJE", sizeValue: 500, sizeUnit: "G", oldPriceCents: 799, newPriceCents: 599, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "etc", name: "Podravka ajvar i butë", emoji: "🌶️", category: "USHQIME_BAZE", sizeValue: 690, sizeUnit: "G", oldPriceCents: 349, newPriceCents: 259, startsInDays: -1, endsInDays: 7 },
  { chainSlug: "etc", name: "Barilla makarona penne", emoji: "🍝", category: "USHQIME_BAZE", sizeValue: 500, sizeUnit: "G", oldPriceCents: 149, newPriceCents: 99, startsInDays: -4, endsInDays: 3 },
  { chainSlug: "etc", name: "Somat tableta për enëlarëse", emoji: "🫧", category: "HIGJIENE_PASTRIM", sizeValue: 50, sizeUnit: "COPE", oldPriceCents: 999, newPriceCents: 749, startsInDays: -2, endsInDays: 8 },
  { chainSlug: "etc", name: "Pampers pelena nr. 4", emoji: "👶", category: "HIGJIENE_PASTRIM", sizeValue: 52, sizeUnit: "COPE", oldPriceCents: 1399, newPriceCents: 999, startsInDays: -1, endsInDays: 6 },
  { chainSlug: "etc", name: "Qumësht Vita", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 125, newPriceCents: 105, startsInDays: -2, endsInDays: 5 },
  { chainSlug: "etc", name: "Ariel detergjent pluhur", emoji: "🧺", category: "HIGJIENE_PASTRIM", sizeValue: 3, sizeUnit: "KG", oldPriceCents: 949, newPriceCents: 649, startsInDays: -1, endsInDays: 5 },
  // upcoming
  { chainSlug: "etc", name: "Kinder Bueno multipack", emoji: "🍬", category: "EMBELSIRA_SNACKS", sizeValue: 6, sizeUnit: "COPE", oldPriceCents: 449, newPriceCents: 339, startsInDays: 3, endsInDays: 9 },

  // ─── Interex ────────────────────────────────────────────────────────
  { chainSlug: "interex", name: "Mish pule i freskët", emoji: "🍗", category: "MISH", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 329, newPriceCents: 249, startsInDays: -2, endsInDays: 3 },
  { chainSlug: "interex", name: "Qumësht Meggle", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 139, newPriceCents: 109, startsInDays: -3, endsInDays: 5 },
  { chainSlug: "interex", name: "Djathë i freskët Vita", emoji: "🧀", category: "BULMET", sizeValue: 400, sizeUnit: "G", oldPriceCents: 329, newPriceCents: 249, startsInDays: -1, endsInDays: 6 },
  { chainSlug: "interex", name: "Pestova çipsa", emoji: "🥔", category: "EMBELSIRA_SNACKS", sizeValue: 150, sizeUnit: "G", oldPriceCents: 99, newPriceCents: 69, startsInDays: -4, endsInDays: 4 },
  { chainSlug: "interex", name: "Ujë Dea pako", emoji: "💧", category: "PIJE", sizeValue: 6, sizeUnit: "COPE", oldPriceCents: 249, newPriceCents: 189, startsInDays: -2, endsInDays: 7 },
  { chainSlug: "interex", name: "Coca-Cola", emoji: "🥤", category: "PIJE", sizeValue: 2, sizeUnit: "L", oldPriceCents: 215, newPriceCents: 159, startsInDays: -3, endsInDays: 4 },
  { chainSlug: "interex", name: "Ace zbardhues", emoji: "🧴", category: "HIGJIENE_PASTRIM", sizeValue: 1, sizeUnit: "L", oldPriceCents: 179, newPriceCents: 129, startsInDays: -2, endsInDays: 8 },
  { chainSlug: "interex", name: "Spec i kuq vendi", emoji: "🫑", category: "PEME_PERIME", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 159, newPriceCents: 109, startsInDays: -1, endsInDays: 2 },
  // expired
  { chainSlug: "interex", name: "Çokollatë Snickers pako", emoji: "🍫", category: "EMBELSIRA_SNACKS", sizeValue: 4, sizeUnit: "COPE", oldPriceCents: 299, newPriceCents: 219, startsInDays: -11, endsInDays: -3 },

  // ─── Albi Market ────────────────────────────────────────────────────
  { chainSlug: "albi-market", name: "Qumësht Vita", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 129, newPriceCents: 95, startsInDays: -2, endsInDays: 4 },
  { chainSlug: "albi-market", name: "Miell M&Sillosi", emoji: "🌾", category: "USHQIME_BAZE", sizeValue: 10, sizeUnit: "KG", oldPriceCents: 799, newPriceCents: 649, startsInDays: -3, endsInDays: 8 },
  { chainSlug: "albi-market", name: "Sheqer kristal", emoji: "🍬", category: "USHQIME_BAZE", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 99, newPriceCents: 79, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "albi-market", name: "Kafe Devolli e bluar", emoji: "☕", category: "PIJE", sizeValue: 500, sizeUnit: "G", oldPriceCents: 579, newPriceCents: 449, startsInDays: -1, endsInDays: 5 },
  { chainSlug: "albi-market", name: "Mish qengji i freskët", emoji: "🥩", category: "MISH", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 899, newPriceCents: 749, startsInDays: -1, endsInDays: 3 },
  { chainSlug: "albi-market", name: "Speca turshi", emoji: "🌶️", category: "USHQIME_BAZE", sizeValue: 1.5, sizeUnit: "KG", oldPriceCents: 349, newPriceCents: 269, startsInDays: -4, endsInDays: 7 },
  { chainSlug: "albi-market", name: "Pallaska peshqir kuzhine", emoji: "🧻", category: "HIGJIENE_PASTRIM", sizeValue: 4, sizeUnit: "COPE", oldPriceCents: 299, newPriceCents: 219, startsInDays: -2, endsInDays: 9 },
  { chainSlug: "albi-market", name: "Rrush i bardhë", emoji: "🍇", category: "PEME_PERIME", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 249, newPriceCents: 179, startsInDays: -1, endsInDays: 2 },
  // expired
  { chainSlug: "albi-market", name: "Vaj ulliri ekstra i virgjër", emoji: "🫒", category: "USHQIME_BAZE", sizeValue: 750, sizeUnit: "ML", oldPriceCents: 899, newPriceCents: 699, startsInDays: -13, endsInDays: -5 },

  // ─── SPAR Kosova ────────────────────────────────────────────────────
  { chainSlug: "spar", name: "SPAR qumësht i freskët", emoji: "🥛", category: "BULMET", sizeValue: 1, sizeUnit: "L", oldPriceCents: 99, newPriceCents: 75, startsInDays: -2, endsInDays: 5 },
  { chainSlug: "spar", name: "SPAR bukë toast", emoji: "🍞", category: "BUKE_BRUMERA", sizeValue: 500, sizeUnit: "G", oldPriceCents: 119, newPriceCents: 89, startsInDays: -3, endsInDays: 4 },
  { chainSlug: "spar", name: "Coca-Cola", emoji: "🥤", category: "PIJE", sizeValue: 2, sizeUnit: "L", oldPriceCents: 209, newPriceCents: 179, startsInDays: -2, endsInDays: 6 },
  { chainSlug: "spar", name: "Mollë Golden", emoji: "🍎", category: "PEME_PERIME", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 109, newPriceCents: 79, startsInDays: -1, endsInDays: 3 },
  { chainSlug: "spar", name: "Lavazza Qualità Oro", emoji: "☕", category: "PIJE", sizeValue: 250, sizeUnit: "G", oldPriceCents: 549, newPriceCents: 429, startsInDays: -2, endsInDays: 7 },
  { chainSlug: "spar", name: "Dove sapun krem", emoji: "🧼", category: "HIGJIENE_PASTRIM", sizeValue: 2, sizeUnit: "COPE", oldPriceCents: 239, newPriceCents: 179, startsInDays: -4, endsInDays: 6 },
  { chainSlug: "spar", name: "Vezë L të freskëta", emoji: "🥚", category: "BULMET", sizeValue: 10, sizeUnit: "COPE", oldPriceCents: 249, newPriceCents: 199, startsInDays: -1, endsInDays: 5 },
  { chainSlug: "spar", name: "SPAR oriz parboiled", emoji: "🍚", category: "USHQIME_BAZE", sizeValue: 1, sizeUnit: "KG", oldPriceCents: 219, newPriceCents: 169, startsInDays: -3, endsInDays: 8 },
];
