import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Hyrja për menaxherë",
};

export default async function LoginPage(props: PageProps<"/hyr">) {
  const session = await getSession();
  if (session) redirect("/menaxho");

  const searchParams = await props.searchParams;
  const returnTo = typeof searchParams.kthehu === "string" ? searchParams.kthehu : "/menaxho";

  return (
    <div className="mx-auto mt-6 w-full max-w-sm md:mt-16">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Hyrja për menaxherë</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Identifikohu për të menaxhuar ofertat e zinxhirit tënd.
        </p>
        <LoginForm returnTo={returnTo} />
      </div>
      <p className="mt-4 text-center text-xs text-ink-soft">
        Vetëm për menaxherët e marketeve partnere.
      </p>
    </div>
  );
}
