"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  onClose: () => void;
  /** Optional gallery: swipe/arrow between these instead of showing src alone. */
  images?: string[];
  initialIndex?: number;
};

/**
 * Full-screen image overlay — closes on Esc, the X button, or a backdrop
 * click. With `images` it becomes a swipeable gallery (touch swipe, ‹ ›
 * buttons, arrow keys) with a page counter.
 */
export function ImageLightbox({ src, onClose, images, initialIndex = 0 }: Props) {
  const gallery = images && images.length > 1 ? images : null;
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = () => gallery && setIndex((i) => Math.max(0, i - 1));
  const next = () => gallery && setIndex((i) => Math.min(gallery.length - 1, i + 1));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, gallery?.length]);

  const current = gallery ? gallery[index] : src;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 45) return;
        if (delta < 0) next();
        else prev();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Mbyll"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-ink shadow-lg transition hover:bg-paper"
      >
        ✕
      </button>

      {gallery && (
        <>
          {index > 0 && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                prev();
              }}
              aria-label="Faqja e mëparshme"
              className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl font-bold text-ink shadow-lg transition hover:bg-paper md:flex"
            >
              ‹
            </button>
          )}
          {index < gallery.length - 1 && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                next();
              }}
              aria-label="Faqja tjetër"
              className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xl font-bold text-ink shadow-lg transition hover:bg-paper md:flex"
            >
              ›
            </button>
          )}
          <span className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-bold text-ink shadow-lg">
            {index + 1} / {gallery.length}
          </span>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current}
        src={current}
        alt=""
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl"
      />
    </div>
  );
}
