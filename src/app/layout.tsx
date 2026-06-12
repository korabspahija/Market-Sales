import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/session";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Aksione — Ofertat e marketeve në Kosovë",
    template: "%s · Aksione",
  },
  description:
    "Të gjitha aksionet e marketeve në Kosovë në një vend: krahaso çmimet te Viva Fresh, ETC, Interex, Albi Market, SPAR, Meridian Express e të tjera, dhe gjej dyqanin më të afërt.",
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const isManager = session !== null;

  return (
    <html lang="sq" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header isManager={isManager} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:pb-10">
          {children}
        </main>
        <BottomNav isManager={isManager} />
      </body>
    </html>
  );
}
