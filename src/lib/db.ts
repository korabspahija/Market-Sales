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
      // Supabase session pooler allows ~15 clients total and every warm
      // serverless instance holds its own pool — keep this small
      max: 2,
      // close idle sockets ourselves before the platform silently kills them
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    }),
  });

  // retry exactly once on a transient connection error — the pool discards
  // the dead socket and the retry runs on a fresh connection. READS ONLY:
  // a write may have committed before the socket died, so retrying it can
  // duplicate rows (e.g. a 145-row createMany published twice)
  const RETRYABLE = new Set([
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
  ]);
  return base.$extends({
    query: {
      $allOperations: async ({ operation, args, query }) => {
        try {
          return await query(args);
        } catch (error) {
          if (!isTransientConnectionError(error) || !RETRYABLE.has(operation)) throw error;
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
