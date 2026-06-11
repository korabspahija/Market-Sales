"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "zbritja", label: "Zbritja më e madhe" },
  { value: "cmimi", label: "Çmimi më i ulët" },
  { value: "rejat", label: "Më të rejat" },
] as const;

export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    if (event.target.value === "zbritja") params.delete("rendit");
    else params.set("rendit", event.target.value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
      Rendit:
      <select
        value={current}
        onChange={handleChange}
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none focus:border-deal"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
