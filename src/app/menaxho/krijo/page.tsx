import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SaleForm } from "@/components/SaleForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Shto ofertë",
};

export default async function CreateSalePage() {
  const session = await getSession();
  if (!session) redirect("/hyr");

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        href="/menaxho"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        ← Paneli
      </Link>
      <div className="rounded-3xl border border-line bg-white p-5 md:p-7">
        <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">Shto ofertë të re</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Oferta shfaqet te blerësit sapo të fillojë periudha e saj.
        </p>
        <div className="mt-6">
          <SaleForm mode="create" />
        </div>
      </div>
    </div>
  );
}
