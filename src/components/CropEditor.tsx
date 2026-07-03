"use client";

import { useEffect, useRef, useState } from "react";

export type NormalizedBox = { x0: number; y0: number; x1: number; y1: number };

/** tap -> auto-sized box around the finger; drag -> exact box */
const TAP_BOX_WIDTH = 0.24;
const TAP_BOX_HEIGHT = 0.2;

/**
 * Mobile-first crop selector over a flier page. A tap drops an auto-sized
 * box around the touched product; dragging draws an exact box (each drag
 * replaces the previous selection — no fiddly resize handles).
 */
export function CropEditor({
  imageUrl,
  onSave,
  onClose,
}: {
  imageUrl: string;
  onSave: (box: NormalizedBox) => Promise<string | null>;
  onClose: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [selection, setSelection] = useState<NormalizedBox | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function pointAt(event: React.PointerEvent): { x: number; y: number } {
    const rect = surface.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function handleDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = pointAt(event);
    drag.current = { ...p, moved: false };
  }

  function handleMove(event: React.PointerEvent) {
    if (!drag.current) return;
    const p = pointAt(event);
    if (Math.abs(p.x - drag.current.x) > 0.015 || Math.abs(p.y - drag.current.y) > 0.015) {
      drag.current.moved = true;
      setSelection({
        x0: Math.min(drag.current.x, p.x),
        y0: Math.min(drag.current.y, p.y),
        x1: Math.max(drag.current.x, p.x),
        y1: Math.max(drag.current.y, p.y),
      });
    }
  }

  function handleUp(event: React.PointerEvent) {
    if (!drag.current) return;
    if (!drag.current.moved) {
      // tap: auto-sized box centred on the finger, clamped to the page
      const p = pointAt(event);
      const x0 = Math.min(Math.max(p.x - TAP_BOX_WIDTH / 2, 0), 1 - TAP_BOX_WIDTH);
      const y0 = Math.min(Math.max(p.y - TAP_BOX_HEIGHT / 2, 0), 1 - TAP_BOX_HEIGHT);
      setSelection({ x0, y0, x1: x0 + TAP_BOX_WIDTH, y1: y0 + TAP_BOX_HEIGHT });
    }
    drag.current = null;
  }

  async function save() {
    if (!selection) return;
    setBusy(true);
    setError(null);
    const failure = await onSave(selection);
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/90 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="text-sm font-bold text-white">
          Prek produktin ose vizato një kuti rreth tij
        </p>
        <button
          onClick={onClose}
          aria-label="Mbyll"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow transition hover:bg-paper"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto px-3">
        <div
          ref={surface}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          className="relative max-h-full cursor-crosshair select-none"
          style={{ touchAction: "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" draggable={false} className="max-h-[70vh] w-auto rounded-lg" />
          {selection && (
            <div
              className="pointer-events-none absolute rounded-md border-2 border-deal"
              style={{
                left: `${selection.x0 * 100}%`,
                top: `${selection.y0 * 100}%`,
                width: `${(selection.x1 - selection.x0) * 100}%`,
                height: `${(selection.y1 - selection.y0) * 100}%`,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
              }}
            />
          )}
        </div>
      </div>

      <div className="space-y-2 p-4">
        {error && (
          <p className="rounded-xl bg-deal-soft px-3.5 py-2 text-center text-sm font-medium text-deal-dark">
            {error}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={save}
            disabled={!selection || busy}
            className="rounded-xl bg-deal px-8 py-3 text-sm font-bold text-white transition hover:bg-deal-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Duke ruajtur…" : "Ruaj imazhin"}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Anulo
          </button>
        </div>
      </div>
    </div>
  );
}
