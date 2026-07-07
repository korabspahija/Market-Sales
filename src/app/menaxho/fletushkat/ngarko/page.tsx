import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UploadFlierForm } from "@/components/UploadFlierForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ngarko fletushkë",
};

export default async function UploadFlierPage() {
  const session = await getSession();
  if (!session) redirect("/hyr");

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href="/menaxho/fletushkat"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        ← Fletushkat
      </Link>
      <div className="rounded-3xl border border-line bg-white p-5 md:p-7">
        <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">Ngarko fletushkë</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ngarko faqet si imazhe (JPG/PNG/WEBP, deri 10 faqe). Pas ngarkimit, Aksione i lexon
          artikujt automatikisht dhe ti i verifikon para publikimit.
        </p>
        <div className="mt-6">
          <UploadFlierForm />
        </div>
      </div>
    </div>
  );
}
