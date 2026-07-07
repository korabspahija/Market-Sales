// One-off: create/refresh the admin account (cross-chain analytics access).
//   npx tsx scripts/add-admin.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // the chain is only an FK anchor for admins — any chain works
  const anchor = await prisma.chain.findFirst({ orderBy: { name: "asc" } });
  if (!anchor) throw new Error("No chains in the database.");

  await prisma.manager.upsert({
    where: { email: "info@aksione.com" },
    update: { isAdmin: true },
    create: {
      chainId: anchor.id,
      name: "Admin",
      email: "info@aksione.com",
      passwordHash: await bcrypt.hash("Aksione2026", 10),
      isAdmin: true,
    },
  });
  console.log("✓ admin info@aksione.com ready (isAdmin=true)");
}

main().finally(() => prisma.$disconnect());
