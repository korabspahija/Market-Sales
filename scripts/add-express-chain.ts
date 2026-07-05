// One-off: add the Express Store chain + manager (auto-fetch source exists).
//   npx tsx scripts/add-express-chain.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const chain = await prisma.chain.upsert({
    where: { slug: "express-store" },
    update: {},
    create: {
      slug: "express-store",
      name: "Express Store",
      brandColor: "#E95D0F",
      logoUrl: "/brands/express-store.png",
    },
  });
  await prisma.manager.upsert({
    where: { email: "menaxher.express@aksione.com" },
    update: {},
    create: {
      chainId: chain.id,
      name: "Menaxheri Express",
      email: "menaxher.express@aksione.com",
      passwordHash: await bcrypt.hash("Aksione2026", 10),
    },
  });
  console.log("✓ Express Store chain + manager ready");
}

main().finally(() => prisma.$disconnect());
