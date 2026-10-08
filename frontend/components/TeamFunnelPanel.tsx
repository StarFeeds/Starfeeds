"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { TeamFunnel } from "@/lib/api/types";

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "–");

/** One funnel step: label, count, conversion from the previous step, bar. */
function Step({ label, value, of, hint }: { label: string; value: number; of?: number; hint?: string }) {
  const width = of === undefined ? 100 : of > 0 ? Math.max(2, (value / of) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-700">{label}</span>
        <span className="font-bold text-neutral-900">
          {value}
          {of !== undefined && <span className="ml-1.5 text-xs font-semibold text-neutral-500">{pct(value, of)}</span>}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-neutral-100">
        <div className="h-2 rounded-full bg-primary-500" style={{ width: `${width}%` }} />
      </div>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

/** Admin: are sign-ups turning into teams? (GET /admin/funnel) */
export function TeamFunnelPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TeamFunnel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.admin
      .funnel(days)
      .then((f) => !cancelled && setData(f))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load funnel"));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const maxWeek = Math.max(1, ...(data?.teams_by_week.map((w) => w.count) ?? [0]));

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-sm text-neutral-900">Team formation</h3>
          <p className="text-xs text-neutral-500">Success = a join request accepted and both people talking in the group.</p>
        </div>
        <div className="flex rounded-full border border-neutral-200 p-0.5 text-xs font-semibold">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 h-7 rounded-full transition ${days === d ? "bg-primary-50 text-primary-700" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive-500">{error}</p>
      ) : !data ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">New people ({data.days}d)</p>
            <Step label="Signed up" value={data.signups} />
            <Step
              label="Posted or asked to join"
              value={data.activated}
              of={data.signups}
              hint={`${data.posted} posted · ${data.requested} asked to join`}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Join requests ({data.days}d)</p>
            <Step label="Sent" value={data.requests} />
            <Step label="Accepted" value={data.accepted} of={data.requests} hint={`${data.declined} declined · ${data.pending} pending`} />
            <Step label="Active team" value={data.teams_active} of={data.accepted} hint="both posted in the group after accepting" />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">
                Median reply: {data.median_response_hours === null ? "–" : `${data.median_response_hours}h`}
              </span>
              {data.pending_over_48h > 0 && (
                <span className="px-2 py-1 rounded-full bg-destructive-500/10 text-destructive-500 font-semibold">
                  {data.pending_over_48h} waiting &gt; 48h
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">Teams formed per week</p>
            <div className="flex items-end justify-between gap-1.5 h-28">
              {data.teams_by_week.map((w) => (
                <div key={w.date} className="flex-1 h-full flex flex-col items-center gap-1 min-w-0">
                  <span className="text-xs font-semibold text-neutral-700">{w.count}</span>
                  {/* The track fills the column so the bar's % height has something to scale against. */}
                  <div className="flex-1 w-full flex items-end">
                    <div className="w-full bg-primary-500 rounded-t-md min-h-[2px]" style={{ height: `${(w.count / maxWeek) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-neutral-400">{w.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
