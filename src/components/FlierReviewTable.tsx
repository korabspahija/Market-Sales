"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, SizeUnit } from "@/generated/prisma/enums";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { UNIT_LABELS } from "@/lib/format";

export type ReviewRow = {
  draftId: string;
  pageNo: number;
  productName: string;
  category: Category | "";
  sizeValue: string;
  sizeUnit: SizeUnit | "";
  oldPrice: string;
  newPrice: string;
  /** the printed "-25%" badge, used to sanity-check the struck-through old price */
  discountPercent: number | null;
  duplicate: boolean;
};

/**
 * The % badge is big and reliably read; the struck-through old price is not.
 * Flags rows where the entered old price disagrees with new/(1 - %) by >5%.
 */
function oldPriceSuspicious(row: ReviewRow): number | null {
  if (!row.discountPercent) return null;
  const oldPrice = parseFloat(row.oldPrice.replace(",", "."));
  const newPrice = parseFloat(row.newPrice.replace(",", "."));
  if (!Number.isFinite(oldPrice) || !Number.isFinite(newPrice) || oldPrice <= 0 || newPrice <= 0) return null;
  const expected = newPrice / (1 - row.discountPercent / 100);
  if (Math.abs(oldPrice - expected) / expected > 0.05) return Math.round(expected * 100) / 100;
  return null;
}

const cellInput =
  "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-xs outline-none transition focus:border-deal";

function rowComplete(row: ReviewRow): boolean {
  return Boolean(
    row.productName.trim().length >= 2 &&
      row.category &&
      row.sizeValue &&
      parseFloat(row.sizeValue) > 0 &&
      row.sizeUnit &&
      row.oldPrice &&
      row.newPrice &&
      parseFloat(row.newPrice.replace(",", ".")) < parseFloat(row.oldPrice.replace(",", ".")),
  );
}

export function FlierReviewTable({
  flierId,
  initialRows,
  defaultStartDate,
  defaultEndDate,
}: {
  flierId: string;
  initialRows: ReviewRow[];
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(initialRows.filter((r) => rowComplete(r) && !r.duplicate).map((r) => r.draftId)),
  );
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateRow(draftId: string, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((row) => (row.draftId === draftId ? { ...row, ...patch } : row)));
  }

  function toggle(draftId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  }

  const selectedRows = rows.filter((row) => checked.has(row.draftId));
  const incompleteSelected = selectedRows.filter((row) => !rowComplete(row));

  async function submit(discardUnchecked: boolean) {
    setError(null);
    if (!discardUnchecked && selectedRows.length === 0) {
      setError("Zgjidh së paku një artikull për publikim.");
      return;
    }
    if (!discardUnchecked && incompleteSelected.length > 0) {
      setError(
        `${incompleteSelected.length} artikuj të zgjedhur kanë fusha bosh ose çmim të ri jo më të ulët — plotësoji ose hiqi nga zgjedhja.`,
      );
      return;
    }
    if (discardUnchecked && !window.confirm("T’i fshijmë artikujt e pazgjedhur? Ky veprim s’kthehet.")) {
      return;
    }

    setBusy(true);
    const payload = discardUnchecked
      ? {
          startDate,
          endDate,
          publish: [],
          discardIds: rows.filter((row) => !checked.has(row.draftId)).map((row) => row.draftId),
        }
      : {
          startDate,
          endDate,
          publish: selectedRows.map((row) => ({
            draftId: row.draftId,
            productName: row.productName.trim(),
            category: row.category,
            sizeValue: row.sizeValue,
            sizeUnit: row.sizeUnit,
            oldPrice: row.oldPrice,
            newPrice: row.newPrice,
          })),
          discardIds: [],
        };

    const res = await fetch(`/api/fliers/${flierId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      router.refresh();
      setBusy(false);
      setChecked(new Set());
      return;
    }
    setError(body?.error ?? "Publikimi dështoi. Provo përsëri.");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold">Oferta vlen prej</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-deal"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">deri më</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-deal"
          />
        </div>
        <p className="text-xs text-ink-soft">Datat vlejnë për të gjithë artikujt që publikon më poshtë.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[880px] text-left text-xs">
          <thead className="border-b border-line bg-paper/60 font-bold text-ink-soft">
            <tr>
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={checked.size === rows.length && rows.length > 0}
                  onChange={() =>
                    setChecked(checked.size === rows.length ? new Set() : new Set(rows.map((r) => r.draftId)))
                  }
                />
              </th>
              <th className="px-2 py-2.5">Produkti</th>
              <th className="w-24 px-2 py-2.5">Madhësia</th>
              <th className="w-24 px-2 py-2.5">Njësia</th>
              <th className="w-44 px-2 py-2.5">Kategoria</th>
              <th className="w-24 px-2 py-2.5">Çm. i vjetër €</th>
              <th className="w-24 px-2 py-2.5">Çm. i ri €</th>
              <th className="w-16 px-2 py-2.5">Faqja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const selected = checked.has(row.draftId);
              const invalid = selected && !rowComplete(row);
              return (
                <tr key={row.draftId} className={invalid ? "bg-deal-soft/60" : selected ? "bg-mint-soft/30" : ""}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected} onChange={() => toggle(row.draftId)} />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.productName}
                      onChange={(e) => updateRow(row.draftId, { productName: e.target.value })}
                      className={cellInput}
                    />
                    {row.duplicate && (
                      <p className="mt-0.5 text-[10px] font-bold text-amber-tag">⚠ Ekziston një ofertë aktive me këtë emër</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.sizeValue}
                      onChange={(e) => updateRow(row.draftId, { sizeValue: e.target.value })}
                      className={cellInput}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.sizeUnit}
                      onChange={(e) => updateRow(row.draftId, { sizeUnit: e.target.value as SizeUnit })}
                      className={cellInput}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {Object.entries(UNIT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.category}
                      onChange={(e) => updateRow(row.draftId, { category: e.target.value as Category })}
                      className={cellInput}
                    >
                      <option value="" disabled>
                        —
                      </option>
                      {CATEGORY_ORDER.map((key) => (
                        <option key={key} value={key}>
                          {CATEGORY_META[key].emoji} {CATEGORY_META[key].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      inputMode="decimal"
                      value={row.oldPrice}
                      onChange={(e) => updateRow(row.draftId, { oldPrice: e.target.value })}
                      placeholder="—"
                      className={cellInput}
                    />
                    {(() => {
                      const expected = oldPriceSuspicious(row);
                      return expected !== null ? (
                        <p className="mt-0.5 text-[10px] font-bold text-amber-tag">
                          ⚠ -{row.discountPercent}% ⇒ ~{expected.toFixed(2)}€
                        </p>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      inputMode="decimal"
                      value={row.newPrice}
                      onChange={(e) => updateRow(row.draftId, { newPrice: e.target.value })}
                      className={`${cellInput} font-bold text-deal`}
                    />
                  </td>
                  <td className="px-2 py-2 text-ink-soft">{row.pageNo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="rounded-xl bg-deal-soft px-3.5 py-2.5 text-sm font-medium text-deal-dark">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => submit(false)}
          disabled={busy || selectedRows.length === 0}
          className="rounded-xl bg-deal px-6 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Duke publikuar…" : `Publiko të zgjedhurat (${selectedRows.length})`}
        </button>
        <button
          onClick={() => submit(true)}
          disabled={busy || rows.length === checked.size}
          className="rounded-xl border border-deal/30 px-5 py-2.5 text-sm font-bold text-deal transition hover:bg-deal-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Fshij të pazgjedhurat ({rows.length - checked.size})
        </button>
        <p className="text-xs text-ink-soft">
          Artikujt e pazgjedhur mbeten si drafte derisa t’i publikosh ose fshish.
        </p>
      </div>
    </div>
  );
}
