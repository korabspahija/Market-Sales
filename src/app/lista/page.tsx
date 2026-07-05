import type { Metadata } from "next";
import { ListaCompare } from "@/components/ListaCompare";

export const metadata: Metadata = {
  title: "Lista ime — krahaso ku është më lirë",
  description:
    "Ngjit listën tënde të blerjeve dhe shiko cili market i Kosovës i ka artikujt në aksion me çmimet më të lira.",
  alternates: { canonical: "/lista" },
};

export default function ListaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">Lista ime</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ngjit listën e blerjeve nga shënimet e tua — një artikull për rresht — dhe shiko cili market i
          ka në aksion më lirë.
        </p>
      </section>
      <ListaCompare />
    </div>
  );
}
