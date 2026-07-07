import { NextResponse } from "next/server";
import { createFlierFromFiles } from "@/lib/createFlier";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "E paautorizuar." }, { status: 401 });

  const form = await request.formData();
  const pages = form.getAll("pages").filter((p): p is File => p instanceof File);

  const result = await createFlierFromFiles(session, pages);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, id: result.id, pages: result.pages }, { status: 201 });
}
