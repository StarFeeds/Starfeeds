"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { Logo } from "@/components/Logo";

type State =
  | { status: "working" }
  | { status: "done"; email: string; scope: "activity" | "weekly" }
  | { status: "error"; message: string };

/** Landing page for the "Stop these emails" link in activity emails. */
function Unsubscribe() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(
    token ? { status: "working" } : { status: "error", message: "This unsubscribe link is incomplete." },
  );

  useEffect(() => {
    if (!token) return;
    api.email
      .unsubscribe(token)
      .then(({ email, scope }) => setState({ status: "done", email, scope }))
      .catch((err) =>
        setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." }),
      );
  }, [token]);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-xs p-8 text-center">
      <div className="flex justify-center mb-6">
        <Link href="/" aria-label="LikeMinds home">
          <Logo size={48} />
        </Link>
      </div>
      {state.status === "working" && <p className="text-neutral-600">Updating your email preferences…</p>}
      {state.status === "done" && (
        <>
          <h1 className="text-xl font-bold text-neutral-900">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-sm text-neutral-600">
            We won&apos;t send <span className="font-semibold text-neutral-800">{state.email}</span>{" "}
            {state.scope === "weekly"
              ? "the weekly digest anymore."
              : "emails about comments, join requests or messages anymore. You'll still see them in the app."}
          </p>
          <p className="mt-2 text-sm text-neutral-600">Changed your mind? Turn them back on in Settings.</p>
        </>
      )}
      {state.status === "error" && (
        <>
          <h1 className="text-xl font-bold text-neutral-900">Couldn&apos;t unsubscribe</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {state.message} You can turn activity emails off in Settings instead.
          </p>
        </>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/settings"
          className="h-11 inline-flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-semibold transition"
        >
          Email settings
        </Link>
        <Link href="/" className="h-11 inline-flex items-center justify-center rounded-full text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition">
          Go to LikeMinds
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <Unsubscribe />
      </Suspense>
    </main>
  );
}
