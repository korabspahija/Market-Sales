import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kushtet e përdorimit",
  description: "Kushtet e përdorimit të Aksione.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Kushtet e përdorimit</h1>

      <div className="space-y-5 rounded-3xl border border-line bg-white p-6 text-sm leading-relaxed text-ink md:p-8">
        <section className="space-y-2">
          <h2 className="font-extrabold">Shërbim informativ</h2>
          <p>
            Aksione është shërbim <strong>informativ</strong> që mbledh e shfaq ofertat e
            marketeve. Nuk shesim produkte dhe nuk jemi palë në blerjet e tua. Çmimet, zbritjet
            dhe afatet mund të ndryshojnë ose të përmbajnë gabime — çmimi i vlefshëm është
            gjithmonë ai në dyqan, dhe nuk mbajmë përgjegjësi për ndryshime a pasaktësi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-extrabold">Markat dhe përmbajtja</h2>
          <p>
            Emrat, logot dhe fletushkat e marketeve u përkasin pronarëve përkatës dhe përdoren
            vetëm për t’i identifikuar ofertat e tyre. Nëse përfaqëson një market dhe ke vërejtje
            për mënyrën si shfaqet përmbajtja jote, na shkruaj në{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-deal hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            dhe reagojmë shpejt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-extrabold">Llogaritë e menaxherëve</h2>
          <p>
            Menaxherët janë përgjegjës për saktësinë e ofertave që publikojnë dhe për ruajtjen e
            kredencialeve të tyre. Rezervojmë të drejtën të heqim përmbajtje të pasaktë a abuzive
            dhe të pezullojmë llogari që keqpërdorin shërbimin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-extrabold">Pa garanci</h2>
          <p>
            Shërbimi ofrohet “siç është”, pa garanci për disponueshmëri të pandërprerë. Këto
            kushte mund të përditësohen; vazhdimi i përdorimit nënkupton pranimin e tyre.
          </p>
        </section>
      </div>
    </article>
  );
}
