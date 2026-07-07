import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const loginSchema = z.object({
  email: z.email("Email-i nuk është i vlefshëm."),
  password: z.string().min(1, "Fjalëkalimi është i detyrueshëm."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Të dhënat nuk janë të vlefshme." }, { status: 400 });
  }

  const manager = await prisma.manager.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { chain: true },
  });

  const passwordOk =
    manager !== null && (await bcrypt.compare(parsed.data.password, manager.passwordHash));
  if (!manager || !passwordOk) {
    return NextResponse.json(
      { error: "Email-i ose fjalëkalimi është i pasaktë." },
      { status: 401 },
    );
  }

  await createSession({
    managerId: manager.id,
    chainId: manager.chainId,
    chainSlug: manager.chain.slug,
    name: manager.name,
    isAdmin: manager.isAdmin,
  });

  return NextResponse.json({ ok: true });
}
