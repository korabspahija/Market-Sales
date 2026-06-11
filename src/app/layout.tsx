import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Zbritje — Ofertat e marketeve në Kosovë",
    template: "%s · Zbritje",
  },
  description:
    "Të gjitha zbritjet e marketeve në Kosovë në një vend: krahaso çmimet te Viva Fresh, Eli-abi, Meridian Express dhe gjej dyqanin më të afërt.",
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:pb-10">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
