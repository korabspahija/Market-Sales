"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Progress = {
  pagesDone: number;
  pagesTotal: number;
  itemsFound: number;
  error: string | null;
  finished: boolean;
};

export function FlierProcessRunner({
  flierId,
  pagesTotal,
  pagesDone,
  retryFailed = false,
}: {
  flierId: string;
  pagesTotal: number;
  pagesDone: number;
  retryFailed?: boolean;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [progress, setProgress] = useState<Progress>({
    pagesDone,
    pagesTotal,
    itemsFound: 0,
    error: null,
    finished: false,
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    async function run() {
      let first = true;
      for (;;) {
        if (cancelled) return;
        const res = await fetch(`/api/fliers/${flierId}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ retryFailed: retryFailed && first }),
        }).catch(() => null);
        first = false;

        if (!res) {
          setProgress((p) => ({ ...p, error: "S’ka lidhje me serverin. Rifresko faqen për të vazhduar." }));
          return;
        }
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setProgress((p) => ({ ...p, error: body?.error ?? "Leximi dështoi." }));
          return;
        }
        setProgress((p) => ({
          pagesTotal: p.pagesTotal,
          pagesDone: p.pagesDone + (body.processedPage ? 1 : 0),
          itemsFound: p.itemsFound + (body.itemsFound ?? 0),
          error: null,
          finished: body.done === true,
        }));
        if (body.done) {
          router.refresh();
          return;
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [flierId, retryFailed, router]);

  const percent = progress.pagesTotal === 0 ? 0 : Math.round((progress.pagesDone / progress.pagesTotal) * 100);

  return (
    <div className="rounded-3xl border border-line bg-white p-6 text-center">
      {progress.error ? (
        <>
          <p className="text-4xl">⚠️</p>
          <p className="mt-3 font-bold">Leximi u ndërpre</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{progress.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink/85"
          >
            Provo përsëri
          </button>
        </>
      ) : (
        <>
          <p className="text-4xl">🤖</p>
          <p className="mt-3 font-bold">
            {progress.finished ? "U lexua!" : "Aksione po e lexon fletushkën…"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Faqja {Math.min(progress.pagesDone + 1, progress.pagesTotal)} nga {progress.pagesTotal} ·{" "}
            {progress.itemsFound} artikuj të gjetur deri tani
          </p>
          <div className="mx-auto mt-4 h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-deal transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Mos e mbyll këtë faqe — zakonisht zgjat gjysmë minute për faqe.
          </p>
        </>
      )}
    </div>
  );
}
