import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Category } from "@/generated/prisma/enums";
import { getAdminStats, type TopEntry, type Trend } from "@/lib/adminStats";
import { CATEGORY_META } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Analitika" };

function TrendChip({ trend }: { trend: Trend }) {
  if (trend.previous === 0 && trend.current === 0) return null;
  if (trend.previous === 0)
    return <span className="text-[11px] font-bold text-mint">e re</span>;
  const change = Math.round(((trend.current - trend.previous) / trend.previous) * 100);
  if (change === 0) return <span className="text-[11px] font-bold text-ink-soft">±0%</span>;
  return (
    <span className={`text-[11px] font-bold ${change > 0 ? "text-mint" : "text-deal"}`}>
      {change > 0 ? "↑" : "↓"} {Math.abs(change)}%
    </span>
  );
}

function KpiCard({ label, trend }: { label: string; trend: Trend }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight">{trend.current}</span>
        <TrendChip trend={trend} />
      </div>
    </div>
  );
}

function BarList({ entries, tone = "bg-ink" }: { entries: TopEntry[]; tone?: string }) {
  if (entries.length === 0) return <EmptyNote />;
  const max = Math.max(...entries.map((e) => e.count));
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.key} className="flex items-center gap-2.5">
          <span className="w-36 shrink-0 truncate text-[13px] font-semibold" title={entry.key}>
            {entry.key}
          </span>
          <span className="h-4 flex-1 overflow-hidden rounded-md bg-paper">
            <span
              className={`block h-full rounded-md ${tone}`}
              style={{ width: `${Math.max(4, Math.round((entry.count / max) * 100))}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-[13px] font-extrabold">{entry.count}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyNote() {
  return <p className="py-4 text-center text-sm text-ink-soft">Ende s’ka të dhëna për këtë periudhë.</p>;
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function categoryLabel(key: string): string {
  const meta = CATEGORY_META[key as Category];
  return meta ? `${meta.emoji} ${meta.label}` : key;
}

export default async function AnalyticsPage(props: PageProps<"/menaxho/analitika">) {
  const session = await getSession();
  if (!session) redirect("/hyr");
  if (!session.isAdmin) redirect("/menaxho");

  const searchParams = await props.searchParams;
  const days = searchParams.ditet === "30" ? 30 : 7;
  const stats = await getAdminStats(days);
  const maxDaily = Math.max(1, ...stats.daily.map((d) => d.count));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">Analitika</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Çka kërkojnë e çka shikojnë vizitorët — {days} ditët e fundit kundrejt {days} ditëve më parë.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-white p-1">
          {[7, 30].map((option) => (
            <Link
              key={option}
              href={`/menaxho/analitika${option === 30 ? "?ditet=30" : ""}`}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                days === option ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option} ditë
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Ngjarje gjithsej" trend={stats.totals.events} />
        <KpiCard label="Kërkime" trend={stats.totals.searches} />
        <KpiCard label="Oferta të hapura" trend={stats.totals.offerViews} />
        <KpiCard label="Fletushka të hapura" trend={stats.totals.flierViews} />
        <KpiCard label="Lista krahasime" trend={stats.totals.listCompares} />
        <KpiCard label="Shpërndarje" trend={stats.totals.shares} />
      </div>

      <Card title="Aktiviteti ditor" hint="Ngjarje gjithsej për ditë">
        <div className="flex h-28 items-end gap-1">
          {stats.daily.map((day) => (
            <div key={day.day} className="group relative flex-1">
              <div
                className="w-full rounded-t-md bg-deal/80 transition group-hover:bg-deal"
                style={{ height: `${Math.max(3, Math.round((day.count / maxDaily) * 100))}px` }}
                title={`${day.day}: ${day.count}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-ink-soft">
          <span>{stats.daily[0]?.day.slice(5)}</span>
          <span>{stats.daily.at(-1)?.day.slice(5)}</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Kërkimet kryesore" hint="Çka shkruajnë njerëzit në kërkim">
          {stats.topSearches.length === 0 ? (
            <EmptyNote />
          ) : (
            <ul className="divide-y divide-line">
              {stats.topSearches.map((search) => (
                <li key={search.q} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {search.q}
                    {search.zeroResults && (
                      <span className="ml-2 rounded-md bg-deal-soft px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-deal-dark">
                        pa rezultat
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-extrabold">{search.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Kërkesa pa përgjigje"
          hint="Kërkime pa rezultat + artikuj të listës pa ofertë në asnjë market — sinjali i mungesës"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold text-ink-soft">Nga kërkimi</p>
              <BarList entries={stats.zeroResultSearches} tone="bg-deal" />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-ink-soft">Nga Lista ime</p>
              <BarList entries={stats.listaUnmatched} tone="bg-deal" />
            </div>
          </div>
        </Card>

        <Card title="Lista ime — çka blejnë njerëzit" hint="Artikujt më të shpeshtë në listat e krahasimit">
          <BarList entries={stats.listaTopLines} />
        </Card>

        <Card title="Fituesit e krahasimeve" hint="Cili market fiton listat e blerjeve">
          <BarList entries={stats.listaWinners} tone="bg-mint" />
        </Card>

        <Card title="Shikime sipas marketeve" hint="Oferta të hapura, sipas zinxhirit">
          <BarList entries={stats.viewsByChain} />
        </Card>

        <Card title="Interesi sipas kategorive" hint="Nga ofertat e hapura">
          <BarList
            entries={stats.viewsByCategory.map((entry) => ({ ...entry, key: categoryLabel(entry.key) }))}
          />
        </Card>

        <Card title="Produktet më të shikuara">
          <BarList entries={stats.topProducts} />
        </Card>

        <Card title="Fletushkat më të shikuara">
          <BarList entries={stats.topFliers.map((f) => ({ key: f.label, count: f.count }))} />
        </Card>
      </div>

      <Card title="Gjendja e marketeve" hint="Oferta aktive dhe fletushka e fundit — për ta parë me një shikim kush ka mbetur pa të dhëna">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-soft">
                <th className="pb-2">Marketi</th>
                <th className="pb-2 text-right">Oferta aktive</th>
                <th className="pb-2 text-right">Fletushka e fundit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stats.chainHealth.map((chain) => (
                <tr key={chain.slug}>
                  <td className="py-2 font-semibold">{chain.name}</td>
                  <td className={`py-2 text-right font-extrabold ${chain.activeOffers > 0 ? "text-mint" : "text-deal"}`}>
                    {chain.activeOffers}
                  </td>
                  <td className="py-2 text-right text-ink-soft">
                    {chain.latestFlierAt ? formatDate(chain.latestFlierAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-ink-soft">
        Të dhënat janë anonime — asnjë informacion personal nuk ruhet. Artikujt e listave dhe kërkimet
        mblidhen që nga 7 korriku 2026.
      </p>
    </div>
  );
}
