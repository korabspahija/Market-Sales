"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UploadFlierForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    setFiles([...(event.target.files ?? [])].slice(0, 10));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Zgjidh së paku një faqe.");
      return;
    }
    setBusy(true);
    setError(null);

    const data = new FormData();
    for (const file of files) data.append("pages", file);

    const res = await fetch("/api/fliers", { method: "POST", body: data });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.id) {
      router.push(`/menaxho/fletushkat/${body.id}`);
      return;
    }
    setError(body?.error ?? "Ngarkimi dështoi. Provo përsëri.");
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-xl file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-ink/85"
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${file.name}-${i}`}
              src={URL.createObjectURL(file)}
              alt={`Faqja ${i + 1}`}
              className="h-24 w-20 rounded-lg border border-line object-cover"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-deal-soft px-3.5 py-2.5 text-sm font-medium text-deal-dark">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy || files.length === 0}
        className="rounded-xl bg-deal px-6 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Duke ngarkuar…" : `Ngarko ${files.length > 0 ? `${files.length} faqe` : ""}`}
      </button>
    </form>
  );
}
