import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aksione — Ofertat e marketeve në Kosovë",
    short_name: "Aksione",
    description:
      "Aksionet e marketeve të Kosovës në një vend — krahaso çmimet dhe kurse në çdo blerje.",
    lang: "sq",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#dc2626",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android share sheet -> new flier. Not in Next's Manifest type yet, so
    // it's merged in via the cast below.
    ...({
      share_target: {
        action: "/api/share-target",
        method: "POST",
        enctype: "multipart/form-data",
        params: {
          files: [{ name: "pages", accept: ["image/jpeg", "image/png", "image/webp"] }],
        },
      },
    } as Partial<MetadataRoute.Manifest>),
  };
}
