import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * On serverless (Vercel) a pooled Postgres socket can be killed while the
 * lambda is frozen; the next query then fails once with a connection error.
 */
function isTransientConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.message} ${(error as { code?: string }).code ?? ""}`;
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|57P01|Connection terminated|Connection closed|connection.*closed|socket hang up|terminating connection/i.test(
    text,
  );
}

function createClient() {
  const base = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // close idle sockets ourselves before the platform silently kills them
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }),
  });

  // retry exactly once on a transient connection error — the pool discards
  // the dead socket and the retry runs on a fresh connection
  return base.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        try {
          return await query(args);
        } catch (error) {
          if (!isTransientConnectionError(error)) throw error;
          return query(args);
        }
      },
    },
  });
}

type ExtendedClient = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
