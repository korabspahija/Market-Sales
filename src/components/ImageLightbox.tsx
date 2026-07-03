"use client";

import { useEffect } from "react";

/** Full-screen image overlay — closes on Esc, the X button, or a backdrop click. */
export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Mbyll"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-ink shadow-lg transition hover:bg-paper"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl"
      />
    </div>
  );
}
