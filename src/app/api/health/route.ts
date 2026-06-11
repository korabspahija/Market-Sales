import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Keep-alive endpoint, pinged daily by the Vercel cron (vercel.json) so the
 * free-tier Supabase database never pauses from inactivity.
 */
export async function GET() {
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ ok: true });
}
