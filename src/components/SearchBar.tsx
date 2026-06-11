import Form from "next/form";

/**
 * GET form -> submits to "/" with ?q=... while keeping the selected filters
 * (passed as hidden inputs). next/form handles client-side navigation.
 */
export function SearchBar({
  defaultValue,
  hidden = {},
}: {
  defaultValue?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <Form action="/" className="relative">
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Kërko produkt, p.sh. qumësht, detergjent…"
        className="w-full rounded-2xl border border-line bg-white py-3.5 pl-11 pr-24 text-sm text-ink caret-deal shadow-sm outline-none transition placeholder:text-ink-soft/70 focus:border-deal focus:ring-2 focus:ring-deal/15"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-deal px-4 py-2 text-sm font-bold text-white transition hover:bg-deal-dark"
      >
        Kërko
      </button>
    </Form>
  );
}
