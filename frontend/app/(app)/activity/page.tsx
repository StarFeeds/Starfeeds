"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { Notification } from "@/lib/api/types";

const TABS = [
  { label: "All", key: "all" },
  { label: "Ratings", key: "ratings" },
  { label: "Comments", key: "comments" },
  { label: "Collaboration Requests", key: "collab" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const EMPTY_COPY: Record<TabKey, string> = {
  all: "Your activity — ratings, comments and collaboration requests — will show up here.",
  ratings: "Ratings on your ideas will appear here.",
  comments: "Comments on your ideas will appear here.",
  collab: "Collaboration requests will appear here.",
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} mins ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export default function ActivityPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await api.activity.list(tab);
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <AppShell>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                tab === t.key
                  ? "bg-primary-50 text-primary-700 border border-primary-200"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm text-neutral-600 max-w-sm mx-auto">{EMPTY_COPY[tab]}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {(n.actor?.full_name ?? "S")[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-700">
                  {n.actor && (
                    <span className="font-semibold text-neutral-900">{n.actor.full_name} </span>
                  )}
                  {n.text}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
