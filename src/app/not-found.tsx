import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-3xl border border-line bg-white px-6 py-14 text-center md:mt-20">
      <p className="text-5xl">🏷️</p>
      <h1 className="mt-4 text-xl font-extrabold tracking-tight">Kjo ofertë s’ekziston më</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Ndoshta ka skaduar ose është hequr. Shiko ofertat aktuale në vend të saj.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-deal px-5 py-2.5 text-sm font-bold text-white transition hover:bg-deal-dark"
      >
        Shiko ofertat
      </Link>
    </div>
  );
}
