import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Rreth nesh",
  description: "Çka është Aksione dhe si funksionon.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Rreth nesh</h1>

      <div className="space-y-4 rounded-3xl border border-line bg-white p-6 text-sm leading-relaxed text-ink md:p-8 md:text-base">
        <p>
          <strong>Aksione</strong> i mbledh në një vend ofertat aktuale të marketeve të Kosovës,
          që ti të mos i shfletosh fletushkat një nga një. Kërko një produkt, krahaso çmimet mes
          zinxhirëve dhe shiko sa kursen — falas dhe pa regjistrim.
        </p>
        <p>
          Ofertat publikohen nga vetë marketet ose nxirren nga fletushkat e tyre zyrtare dhe
          verifikohen para publikimit. Megjithatë, çmimet janë <strong>informative</strong>:
          vendimtare është gjithmonë çmimi në dyqan.
        </p>
        <p>
          Je market dhe do t’i publikosh ofertat e tua në Aksione? Na shkruaj në{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-deal hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          — publikimi është i thjeshtë: ngarkon fletushkën, ne e lexojmë automatikisht, ti vetëm i
          verifikon çmimet.
        </p>
        <p>
          Na ndiq në{" "}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-deal hover:underline"
          >
            Instagram
          </a>{" "}
          për ofertat më të mira të javës.
        </p>
      </div>

      <Link
        href="/"
        className="inline-block rounded-xl bg-deal px-5 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark"
      >
        Shiko ofertat
      </Link>
    </article>
  );
}
