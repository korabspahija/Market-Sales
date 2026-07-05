"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/",
    label: "Ofertat",
    icon: (
      <path d="M3.7 11.3 11.3 3.7A2.4 2.4 0 0 1 13 3h5.6A2.4 2.4 0 0 1 21 5.4V11c0 .64-.25 1.25-.7 1.7l-7.6 7.6a2.4 2.4 0 0 1-3.4 0l-5.6-5.6a2.4 2.4 0 0 1 0-3.4Z M16.5 7.5h.01" />
    ),
  },
  {
    href: "/fletushkat",
    label: "Fletushkat",
    icon: (
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2 M18 14h-8 M15 18h-5 M10 6h8v4h-8V6Z" />
    ),
  },
  {
    href: "/dyqanet",
    label: "Dyqanet",
    icon: (
      <path d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    ),
  },
  {
    href: "/menaxho",
    label: "Menaxho",
    icon: (
      <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 21a7.5 7.5 0 0 1 15 0" />
    ),
  },
];

export function BottomNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname();
  const items = isManager ? ITEMS : ITEMS.filter((item) => item.href !== "/menaxho");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/oferta")
              : item.href === "/fletushkat"
                ? pathname.startsWith("/fletushka") // covers the /fletushka/[id] detail too
                : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${
                active ? "text-deal" : "text-ink-soft"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
