// One-off: add Maxi and Conad (Prishtina chains, fliers on Facebook only).
//   npx tsx scripts/add-prishtina-chains.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const mapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

type ChainSeed = {
  slug: string;
  name: string;
  brandColor: string;
  logoUrl: string;
  email: string;
  managerName: string;
  stores: { name: string; city: string; address: string }[];
};

const CHAINS: ChainSeed[] = [
  {
    slug: "maxi",
    name: "Maxi",
    brandColor: "#EA2629",
    logoUrl: "/brands/maxi.svg",
    email: "menaxher.maxi@aksione.com",
    managerName: "Menaxheri Maxi",
    stores: [
      { name: "Maxi – Bregu i Diellit", city: "Prishtinë", address: "Bregu i Diellit" },
      { name: "Maxi – Tophane", city: "Prishtinë", address: "Tophane" },
      { name: "Maxi – Dardania", city: "Prishtinë", address: "Dardania" },
      { name: "Maxi – Qendër", city: "Prishtinë", address: "Qendra e Prishtinës" },
    ],
  },
  {
    slug: "conad",
    name: "Conad",
    brandColor: "#E2001A",
    logoUrl: "/brands/conad.svg",
    email: "menaxher.conad@aksione.com",
    managerName: "Menaxheri Conad",
    stores: [
      { name: "Conad – Bregu i Diellit", city: "Prishtinë", address: "Bregu i Diellit" },
      { name: "Conad – Arbëri", city: "Prishtinë", address: "Arbëri, te Komuna e re" },
      { name: "Conad – Dardania", city: "Prishtinë", address: "Dardania, te Ora" },
    ],
  },
];

async function main() {
  for (const seed of CHAINS) {
    const chain = await prisma.chain.upsert({
      where: { slug: seed.slug },
      update: { name: seed.name, brandColor: seed.brandColor, logoUrl: seed.logoUrl },
      create: { slug: seed.slug, name: seed.name, brandColor: seed.brandColor, logoUrl: seed.logoUrl },
    });

    await prisma.manager.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        chainId: chain.id,
        name: seed.managerName,
        email: seed.email,
        passwordHash: await bcrypt.hash("Aksione2026", 10),
      },
    });

    // stores are informational for /dyqanet — only add if none exist yet
    const existingStores = await prisma.store.count({ where: { chainId: chain.id } });
    if (existingStores === 0) {
      await prisma.store.createMany({
        data: seed.stores.map((store) => ({
          chainId: chain.id,
          name: store.name,
          city: store.city,
          address: store.address,
          mapsUrl: mapsUrl(`${store.name} ${store.city}`),
        })),
      });
    }
    console.log(`✓ ${seed.name}: chain + manager + ${seed.stores.length} stores ready`);
  }
}

main().finally(() => prisma.$disconnect());
