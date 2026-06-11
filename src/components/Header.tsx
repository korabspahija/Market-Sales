import Link from "next/link";
import { getSession } from "@/lib/session";
import { Logo } from "./Logo";

export async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-extrabold tracking-tight">
            Zbritje<span className="text-deal">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink"
          >
            Ofertat
          </Link>
          <Link
            href="/dyqanet"
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink"
          >
            Dyqanet
          </Link>
          <Link
            href="/menaxho"
            className="ml-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85"
          >
            {session ? "Paneli im" : "Për menaxherë"}
          </Link>
        </nav>

        <Link
          href="/menaxho"
          className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white md:hidden"
        >
          {session ? "Paneli" : "Menaxherët"}
        </Link>
      </div>
    </header>
  );
}
