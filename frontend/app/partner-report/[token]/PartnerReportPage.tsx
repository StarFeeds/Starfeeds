"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { PartnerReport } from "@/lib/api/types";
import { Logo } from "@/components/Logo";
import { PartnerReportView } from "@/components/PartnerReportView";
import { FeedSkeleton } from "@/components/Skeleton";

export function PartnerReportPage({ token }: { token: string }) {
  const [report, setReport] = useState<PartnerReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.partners
      .report(token)
      .then((r) => !cancelled && setReport(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load this report"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="LikeMinds home">
            <Logo size={32} />
          </Link>
          <span className="text-sm font-semibold text-neutral-500">Community report</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
            <p className="text-neutral-700">{error}</p>
            <p className="mt-2 text-sm text-neutral-500">Ask the LikeMinds team for a new link.</p>
          </div>
        ) : !report ? (
          <FeedSkeleton count={2} />
        ) : (
          <>
            <h1 className="text-2xl font-bold text-neutral-900">How your community is building on LikeMinds</h1>
            <p className="mt-1 mb-6 text-sm text-neutral-500">
              Live numbers for members who joined through your link. Keep this page private: anyone with the link can see it.
            </p>
            <PartnerReportView report={report} />
          </>
        )}
      </main>
    </div>
  );
}
