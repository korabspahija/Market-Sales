import Link from "next/link";
import { Logo } from "./Logo";

export function Header({ isManager }: { isManager: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-extrabold tracking-tight">
            Aksione<span className="text-deal">.</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink md:block"
          >
            Ofertat
          </Link>
          <Link
            href="/dyqanet"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-paper hover:text-ink md:block"
          >
            Dyqanet
          </Link>
          {isManager && (
            <Link
              href="/menaxho"
              className="ml-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85"
            >
              Paneli im
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
