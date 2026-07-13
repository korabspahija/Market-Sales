import { NextResponse } from "next/server";
import { z } from "zod";
import { isBotUserAgent } from "@/lib/analytics";
import { prisma } from "@/lib/db";

// only event types that genuinely need client-side reporting
const clientEventSchema = z.object({
  type: z.literal("share"),
  data: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
});

export async function POST(request: Request) {
  if (isBotUserAgent(request.headers.get("user-agent") ?? "")) {
    return new NextResponse(null, { status: 204 });
  }
  const body = await request.json().catch(() => null);
  const parsed = clientEventSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  try {
    await prisma.event.create({
      data: { type: parsed.data.type, data: parsed.data.data ?? {} },
    });
  } catch {
    // analytics must never surface errors to users
  }
  return new NextResponse(null, { status: 204 });
}
