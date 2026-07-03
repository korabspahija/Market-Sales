import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politika e privatësisë",
  description: "Si i trajton Aksione të dhënat e vizitorëve dhe menaxherëve.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Politika e privatësisë</h1>

      <div className="space-y-5 rounded-3xl border border-line bg-white p-6 text-sm leading-relaxed text-ink md:p-8">
        <section className="space-y-2">
          <h2 className="font-extrabold">Për vizitorët</h2>
          <p>
            Aksione mund të përdoret pa llogari dhe pa dhënë asnjë të dhënë personale. Nuk
            përdorim cookies reklamash dhe nuk të ndjekim nëpër faqe të tjera. Si çdo shërbim
            interneti, serverët tanë mbajnë përkohësisht regjistra teknikë (p.sh. adresa IP) për
            sigurinë dhe funksionimin e faqes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-extrabold">Për menaxherët e marketeve</h2>
          <p>
            Llogaritë e menaxherëve ruajnë emrin, email-in dhe fjalëkalimin e koduar. Pas hyrjes
            përdoret një cookie i domosdoshëm sesioni (<code>aksione_session</code>) — vetëm për
            t’ju mbajtur të identifikuar; skadon pas 7 ditësh. Fletushkat e ngarkuara përpunohen
            automatikisht për të nxjerrë ofertat; imazhet ruhen në infrastrukturën tonë
            (Supabase, BE).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-extrabold">Ndarja e të dhënave</h2>
          <p>
            Nuk i shesim dhe nuk i ndajmë të dhënat personale me palë të treta. Statistika të
            agreguara e anonime (p.sh. sa herë është kërkuar një produkt) mund të përdoren për të
            përmirësuar shërbimin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-extrabold">Të drejtat e tua</h2>
          <p>
            Mund të kërkosh qasje, korrigjim ose fshirje të të dhënave të tua duke na shkruar në{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-deal hover:underline">
              {CONTACT_EMAIL}
            </a>
            . Kjo politikë mund të përditësohet; ndryshimet publikohen në këtë faqe.
          </p>
        </section>
      </div>
    </article>
  );
}
