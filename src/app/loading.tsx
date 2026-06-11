export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-44 animate-pulse rounded-3xl bg-ink/10 md:h-52" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-ink/10" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-white">
            <div className="aspect-square bg-ink/10" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-4/5 rounded bg-ink/10" />
              <div className="h-3 w-3/5 rounded bg-ink/10" />
              <div className="h-5 w-2/5 rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
