import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PageProcessError, processNextPendingPage } from "@/lib/processFlier";
import { getSession } from "@/lib/session";

// one vision call per invocation — the client loops until done
export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/fliers/[id]/process">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const { id } = await ctx.params;
  const flier = await prisma.flier.findUnique({ where: { id }, include: { pages: true } });
  if (!flier || flier.chainId !== session.chainId) {
    return NextResponse.json({ error: "Fletushka nuk u gjet." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { retryFailed?: boolean } | null;
  if (body?.retryFailed && flier.pages.some((p) => p.status === "FAILED")) {
    await prisma.flierPage.updateMany({
      where: { flierId: id, status: "FAILED" },
      data: { status: "PENDING" },
    });
    await prisma.flier.update({ where: { id }, data: { status: "PROCESSING", error: null } });
  }

  try {
    const result = await processNextPendingPage(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PageProcessError) {
      return NextResponse.json({ error: error.message, processedPage: error.pageNo }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Gabim i panjohur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
