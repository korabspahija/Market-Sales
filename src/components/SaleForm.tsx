"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category, SizeUnit } from "@/generated/prisma/enums";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { UNIT_LABELS } from "@/lib/format";
import { CropEditor } from "./CropEditor";

export type SaleFormDefaults = {
  productName: string;
  category: Category;
  sizeValue: number;
  sizeUnit: SizeUnit;
  oldPrice: string;
  newPrice: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
};

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const inputClass =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none transition focus:border-deal focus:bg-white focus:ring-2 focus:ring-deal/15";

export function SaleForm({
  mode,
  saleId,
  defaults,
  flierPageUrl,
}: {
  mode: "create" | "edit";
  saleId?: string;
  defaults?: SaleFormDefaults;
  /** source flier page — enables re-cropping the product image from it */
  flierPageUrl?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(defaults?.imageUrl ?? null);
  const [cropOpen, setCropOpen] = useState(false);

  async function saveFlierCrop(box: { x0: number; y0: number; x1: number; y1: number }) {
    const res = await fetch(`/api/sales/${saleId}/crop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(box),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return body?.error ?? "Prerja dështoi. Provo përsëri.";
    setPreview(body.imageUrl);
    router.refresh();
    return null;
  }

  const today = new Date();
  const inAWeek = new Date(today.getTime() + 7 * 86_400_000);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const oldPrice = parseFloat(String(data.get("oldPrice")).replace(",", "."));
    const newPrice = parseFloat(String(data.get("newPrice")).replace(",", "."));
    if (Number.isFinite(oldPrice) && Number.isFinite(newPrice) && newPrice >= oldPrice) {
      setError("Çmimi i ri duhet të jetë më i ulët se çmimi i vjetër.");
      return;
    }
    if (String(data.get("endDate")) < String(data.get("startDate"))) {
      setError("Data e mbarimit duhet të jetë pas datës së fillimit.");
      return;
    }

    setBusy(true);
    const res = await fetch(mode === "create" ? "/api/sales" : `/api/sales/${saleId}`, {
      method: mode === "create" ? "POST" : "PUT",
      body: data,
    });

    if (res.ok) {
      router.push("/menaxho");
      router.refresh();
      return;
    }

    const body = await res.json().catch(() => null);
    setError(body?.error ?? "Diçka shkoi keq. Provo përsëri.");
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="productName" className="mb-1.5 block text-sm font-semibold">
          Emri i produktit
        </label>
        <input
          id="productName"
          name="productName"
          required
          maxLength={80}
          defaultValue={defaults?.productName}
          placeholder="p.sh. Qumësht Vita 1L"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-semibold">
            Kategoria
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={defaults?.category ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Zgjidh…
            </option>
            {CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_META[key].emoji} {CATEGORY_META[key].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sizeValue" className="mb-1.5 block text-sm font-semibold">
            Madhësia
          </label>
          <div className="flex gap-2">
            <input
              id="sizeValue"
              name="sizeValue"
              type="number"
              required
              min="0.01"
              step="0.01"
              defaultValue={defaults?.sizeValue}
              placeholder="750"
              className={inputClass}
            />
            <select
              name="sizeUnit"
              required
              defaultValue={defaults?.sizeUnit ?? "G"}
              aria-label="Njësia"
              className={`${inputClass} w-28`}
            >
              {Object.entries(UNIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="oldPrice" className="mb-1.5 block text-sm font-semibold">
            Çmimi i vjetër (€)
          </label>
          <input
            id="oldPrice"
            name="oldPrice"
            required
            inputMode="decimal"
            pattern="\d+([.,]\d{1,2})?"
            defaultValue={defaults?.oldPrice}
            placeholder="8.99"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="newPrice" className="mb-1.5 block text-sm font-semibold">
            Çmimi i ri (€)
          </label>
          <input
            id="newPrice"
            name="newPrice"
            required
            inputMode="decimal"
            pattern="\d+([.,]\d{1,2})?"
            defaultValue={defaults?.newPrice}
            placeholder="5.99"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startDate" className="mb-1.5 block text-sm font-semibold">
            Fillon më
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={defaults?.startDate ?? toDateInput(today)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="mb-1.5 block text-sm font-semibold">
            Mbaron më
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={defaults?.endDate ?? toDateInput(inAWeek)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="image" className="mb-1.5 block text-sm font-semibold">
          Imazhi i produktit{" "}
          {mode === "edit" && <span className="font-normal text-ink-soft">(lëre bosh për ta mbajtur)</span>}
        </label>
        <div className="flex items-center gap-4">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Pamja paraprake"
              className="h-20 w-20 rounded-xl border border-line object-cover"
            />
          )}
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            required={mode === "create"}
            onChange={handleImageChange}
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-xl file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-ink/85"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">JPG, PNG, WEBP ose SVG — maksimumi 4 MB.</p>
        {mode === "edit" && saleId && flierPageUrl && (
          <button
            type="button"
            onClick={() => setCropOpen(true)}
            className="mt-2 rounded-xl border border-line px-4 py-2 text-xs font-bold transition hover:border-deal hover:bg-deal-soft"
          >
            ✂️ Prije imazhin nga fletushka
          </button>
        )}
      </div>

      {cropOpen && flierPageUrl && (
        <CropEditor imageUrl={flierPageUrl} onSave={saveFlierCrop} onClose={() => setCropOpen(false)} />
      )}

      {error && (
        <p className="rounded-xl bg-deal-soft px-3.5 py-2.5 text-sm font-medium text-deal-dark">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-deal px-6 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Duke ruajtur…" : mode === "create" ? "Publiko ofertën" : "Ruaj ndryshimet"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/menaxho")}
          className="rounded-xl border border-line px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:border-ink/40 hover:text-ink"
        >
          Anulo
        </button>
      </div>
    </form>
  );
}
