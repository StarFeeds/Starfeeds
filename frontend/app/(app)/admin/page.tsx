"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { AdminStats } from "@/lib/api/types";

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.admin.stats();
        if (!cancelled) setStats(s);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load stats");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="p-4 bg-destructive-500/10 border border-destructive-500/20 rounded-xl text-sm text-destructive-500">{error}</div>;
  }
  if (!stats) {
    return <div className="text-center py-12 text-neutral-600">Loading…</div>;
  }

  const maxDay = Math.max(1, ...stats.signups_by_day.map((d) => d.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile label="Users" value={stats.users_total} hint={`${stats.users_active} active · ${stats.users_admin} admin`} />
        <Tile label="Ideas" value={stats.ideas_total} hint={`${stats.ideas_hidden} hidden`} />
        <Tile label="Comments" value={stats.comments_total} />
        <Tile label="Collab (pending)" value={stats.collab_pending} />
        <Tile label="Conversations" value={stats.conversations_total} />
        <Tile label="Messages" value={stats.messages_total} />
        <Tile label="Signups (today)" value={stats.signups_today} />
        <Tile label="Signups (30d)" value={stats.signups_30d} hint={`${stats.signups_7d} in 7d`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signups last 7 days */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
          <h3 className="font-bold text-sm text-neutral-900 mb-3">Signups — last 7 days</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.signups_by_day.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-xs font-semibold text-neutral-700">{d.count}</span>
                <div
                  className="w-full bg-primary-500 rounded-t-md min-h-[2px]"
                  style={{ height: `${(d.count / maxDay) * 100}%` }}
                />
                <span className="text-[10px] text-neutral-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top ideas */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
          <h3 className="font-bold text-sm text-neutral-900 mb-3">Top ideas by upvotes</h3>
          {stats.top_ideas.length === 0 ? (
            <p className="text-sm text-neutral-500">No ideas yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.top_ideas.map((i, idx) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-neutral-400 font-semibold">{idx + 1}</span>
                  <span className="flex-1 truncate text-neutral-800">{i.title}</span>
                  <span className="font-bold text-primary-700">{i.upvotes}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
