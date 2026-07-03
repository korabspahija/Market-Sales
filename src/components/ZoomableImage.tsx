"use client";

import { useState } from "react";
import { ImageLightbox } from "./ImageLightbox";

/** Product image that opens full-screen on tap (closes with ✕, Esc or a backdrop tap). */
export function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Shiko më të madhe" className="block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open && <ImageLightbox src={src} onClose={() => setOpen(false)} />}
    </>
  );
}
