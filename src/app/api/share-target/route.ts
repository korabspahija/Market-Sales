import { NextResponse } from "next/server";
import { createFlierFromFiles } from "@/lib/createFlier";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

/**
 * Android share-target: the installed PWA appears in the system share sheet,
 * so a manager can send a flier straight from the Facebook/gallery app into a
 * new flier. Shared files arrive as a multipart POST (see the manifest
 * share_target). On success we 303 to the review screen; every exit is a
 * redirect because the browser navigated here from the share sheet, not fetch.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const to = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const session = await getSession();
  if (!session) return to("/hyr?share=1");

  let files: File[] = [];
  try {
    const form = await request.formData();
    files = form.getAll("pages").filter((p): p is File => p instanceof File && p.size > 0);
  } catch {
    return to("/menaxho/fletushkat/ngarko?share=error");
  }
  if (files.length === 0) return to("/menaxho/fletushkat/ngarko?share=empty");

  const result = await createFlierFromFiles(session, files);
  if (!result.ok) {
    return to(`/menaxho/fletushkat/ngarko?share=error&msg=${encodeURIComponent(result.error)}`);
  }
  return to(`/menaxho/fletushkat/${result.id}`);
}
