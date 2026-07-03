import Link from "next/link";
import { CONTACT_EMAIL, INSTAGRAM_URL } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-white pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <span className="text-lg font-extrabold tracking-tight">
                Aksione<span className="text-deal">.</span>
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Aksionet e marketeve të Kosovës në një vend — krahaso çmimet dhe kurse në çdo blerje.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm md:grid-cols-2">
            <Link href="/" className="font-semibold text-ink-soft transition hover:text-ink">
              Ofertat
            </Link>
            <Link href="/rreth-nesh" className="font-semibold text-ink-soft transition hover:text-ink">
              Rreth nesh
            </Link>
            <Link href="/dyqanet" className="font-semibold text-ink-soft transition hover:text-ink">
              Dyqanet
            </Link>
            <Link href="/privatesia" className="font-semibold text-ink-soft transition hover:text-ink">
              Privatësia
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink-soft transition hover:text-ink"
            >
              Instagram
            </a>
            <Link href="/kushtet" className="font-semibold text-ink-soft transition hover:text-ink">
              Kushtet e përdorimit
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="col-span-2 font-semibold text-ink-soft transition hover:text-ink"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-line pt-4 text-xs text-ink-soft">
          <p>
            Çmimet dhe ofertat janë informative dhe mund të ndryshojnë pa njoftim — verifikoji
            gjithmonë në dyqan. Logot dhe emrat e marketeve u përkasin pronarëve të tyre.
          </p>
          <p>© {new Date().getFullYear()} Aksione · Kosovë</p>
        </div>
      </div>
    </footer>
  );
}
