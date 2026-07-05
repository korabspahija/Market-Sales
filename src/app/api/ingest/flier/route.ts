import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Step 1 of the laptop-agent upload: register a flier shell for a source the
 * server can't reach itself (WAF-blocked chains). Pages follow one by one via
 * /api/ingest/flier/[id]/page; the next cron sweep processes and publishes.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const chainSlug = typeof body?.chainSlug === "string" ? body.chainSlug : null;
  const sourceKey = typeof body?.sourceKey === "string" ? body.sourceKey : null;
  if (!chainSlug || !sourceKey) {
    return NextResponse.json({ error: "chainSlug and sourceKey required" }, { status: 400 });
  }

  const existing = await prisma.flier.findUnique({ where: { sourceKey } });
  if (existing) return NextResponse.json({ id: existing.id, existing: true });

  const chain = await prisma.chain.findUnique({ where: { slug: chainSlug } });
  if (!chain) return NextResponse.json({ error: "unknown chain" }, { status: 400 });

  const flier = await prisma.flier.create({ data: { chainId: chain.id, sourceKey } });
  return NextResponse.json({ id: flier.id, existing: false }, { status: 201 });
}
