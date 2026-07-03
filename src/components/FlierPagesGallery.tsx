"use client";

import { useState } from "react";
import { ImageLightbox } from "./ImageLightbox";

type Page = { id: string; pageNo: number; imageUrl: string; thumbUrl?: string | null; failed?: boolean };

/** Horizontal strip of flier pages; tapping opens a full-screen lightbox (mobile-first). */
export function FlierPagesGallery({ pages, size = "lg" }: { pages: Page[]; size?: "sm" | "lg" }) {
  const [open, setOpen] = useState<string | null>(null);
  const dimensions = size === "lg" ? "h-36 w-27" : "h-28 w-20";

  return (
    <>
      <div className="chip-row -mx-4 flex gap-2 overflow-x-auto px-4">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setOpen(page.imageUrl)}
            title={`Faqja ${page.pageNo}`}
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.thumbUrl ?? page.imageUrl}
              alt={`Faqja ${page.pageNo}`}
              loading="lazy"
              className={`${dimensions} rounded-xl border object-cover transition hover:opacity-90 ${
                page.failed ? "border-deal opacity-60" : "border-line"
              }`}
            />
          </button>
        ))}
      </div>
      {open && <ImageLightbox src={open} onClose={() => setOpen(null)} />}
    </>
  );
}
