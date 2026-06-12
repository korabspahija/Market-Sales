import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORY_META } from "../src/lib/categories";
import { normalizeSearch, slugify } from "../src/lib/text";
import { CHAINS, MANAGER_PASSWORD, MANAGERS, SALES, STORES } from "./seed-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SEED_DIR = path.join(process.cwd(), "public", "seed");

function productSvg(emoji: string, [from, to]: [string, string]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="480" fill="url(#g)"/>
  <circle cx="404" cy="76" r="110" fill="#ffffff" opacity="0.25"/>
  <circle cx="60" cy="420" r="130" fill="#ffffff" opacity="0.18"/>
  <text x="240" y="252" font-size="190" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>
`;
}

function logoSvg(letter: string, color: string, dark: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="24" fill="url(#g)"/>
  <text x="48" y="54" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${letter}</text>
</svg>
`;
}

function daysFromNow(days: number, now: Date): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

async function main() {
  const now = new Date();
  mkdirSync(SEED_DIR, { recursive: true });

  // 1. images — real brand logos live in public/brands/; lettermark fallback otherwise
  for (const chain of CHAINS) {
    if (!chain.logoFile) {
      writeFileSync(
        path.join(SEED_DIR, `logo-${chain.slug}.svg`),
        logoSvg(chain.letter, chain.brandColor, chain.darkColor),
      );
    }
  }
  for (const sale of SALES) {
    const file = `${slugify(sale.name)}.svg`;
    writeFileSync(path.join(SEED_DIR, file), productSvg(sale.emoji, CATEGORY_META[sale.category].gradient));
  }
  console.log(`✓ U gjeneruan ${CHAINS.length + SALES.length} imazhe në public/seed/`);

  // 2. wipe (FK order)
  await prisma.sale.deleteMany();
  await prisma.store.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.chain.deleteMany();

  // 3. chains
  const chainIds = new Map<string, string>();
  for (const chain of CHAINS) {
    const created = await prisma.chain.create({
      data: {
        name: chain.name,
        slug: chain.slug,
        brandColor: chain.brandColor,
        logoUrl: chain.logoFile ? `/brands/${chain.logoFile}` : `/seed/logo-${chain.slug}.svg`,
      },
    });
    chainIds.set(chain.slug, created.id);
  }

  // 4. stores
  for (const store of STORES) {
    await prisma.store.create({
      data: {
        chainId: chainIds.get(store.chainSlug)!,
        name: store.name,
        city: store.city,
        address: store.address,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${store.name}, ${store.address}, ${store.city}`,
        )}`,
      },
    });
  }

  // 5. managers
  for (const manager of MANAGERS) {
    await prisma.manager.create({
      data: {
        chainId: chainIds.get(manager.chainSlug)!,
        name: manager.name,
        email: manager.email,
        passwordHash: await bcrypt.hash(manager.password, 10),
      },
    });
  }

  // 6. sales
  for (const sale of SALES) {
    await prisma.sale.create({
      data: {
        chainId: chainIds.get(sale.chainSlug)!,
        productName: sale.name,
        searchName: normalizeSearch(sale.name),
        category: sale.category,
        sizeValue: sale.sizeValue,
        sizeUnit: sale.sizeUnit,
        oldPriceCents: sale.oldPriceCents,
        newPriceCents: sale.newPriceCents,
        imageUrl: `/seed/${slugify(sale.name)}.svg`,
        startsAt: daysFromNow(sale.startsInDays, now),
        endsAt: daysFromNow(sale.endsInDays, now),
      },
    });
  }

  const active = SALES.filter((s) => s.startsInDays <= 0 && s.endsInDays > 0).length;
  const expired = SALES.filter((s) => s.endsInDays <= 0).length;
  const upcoming = SALES.filter((s) => s.startsInDays > 0).length;
  console.log(
    `✓ U mbollën: ${CHAINS.length} zinxhirë, ${STORES.length} dyqane, ${MANAGERS.length} menaxherë, ${SALES.length} oferta (${active} aktive, ${expired} të skaduara, ${upcoming} të ardhshme)`,
  );
  console.log(`\nLlogaritë e menaxherëve (fjalëkalimi: ${MANAGER_PASSWORD}):`);
  for (const manager of MANAGERS) console.log(`  ${manager.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
