"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { CollaborationRequest, Notification } from "@/lib/api/types";

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
  collab: "No pending collaboration requests.",
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

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-sm font-bold">{(name ?? "S")[0]}</span>
    </div>
  );
}

const TAB_KEYS = TABS.map((t) => t.key);

function ActivityView() {
  const params = useSearchParams();
  const initialTab = TAB_KEYS.includes(params.get("tab") as TabKey)
    ? (params.get("tab") as TabKey)
    : "all";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [items, setItems] = useState<Notification[]>([]);
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotice(null);
    (async () => {
      try {
        if (tab === "collab") {
          const reqs = await api.collaboration.list("incoming");
          if (!cancelled) setRequests(reqs.filter((r) => r.status === "pending"));
        } else {
          const data = await api.activity.list(tab);
          if (!cancelled) setItems(data);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setRequests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const resolve = async (id: number, accept: boolean) => {
    setRequests((prev) => prev.filter((r) => r.id !== id)); // optimistic
    setNotice(
      accept
        ? "Request accepted — a conversation was started. Open Messages to chat."
        : "Request declined."
    );
    try {
      if (accept) await api.collaboration.accept(id);
      else await api.collaboration.decline(id);
    } catch {
      // On failure, reload the list so the card reappears.
      try {
        const reqs = await api.collaboration.list("incoming");
        setRequests(reqs.filter((r) => r.status === "pending"));
        setNotice("Something went wrong — please try again.");
      } catch {
        /* ignore */
      }
    }
  };

  const isEmpty = tab === "collab" ? requests.length === 0 : items.length === 0;

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

      {notice && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl">
          <p className="text-sm text-primary-700">{notice}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading...</div>
      ) : isEmpty ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm text-neutral-600 max-w-sm mx-auto">{EMPTY_COPY[tab]}</p>
        </div>
      ) : tab === "collab" ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {requests.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
              <Link href={`/u/${r.from_user.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                <Avatar name={r.from_user.full_name} />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-900">
                    <span className="font-semibold group-hover:text-primary-700 transition">{r.from_user.full_name}</span> wants to collaborate
                  </p>
                  <p className="text-xs text-neutral-500">
                    {r.from_user.headline} · {timeAgo(r.created_at)}
                  </p>
                </div>
              </Link>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => resolve(r.id, true)}
                  className="px-5 h-9 bg-success-500 hover:opacity-90 text-white text-sm font-semibold rounded-full transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => resolve(r.id, false)}
                  className="px-5 h-9 border border-destructive-500 text-destructive-500 hover:bg-destructive-500/5 text-sm font-semibold rounded-full transition"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-4">
              {n.actor ? (
                <Link href={`/u/${n.actor.username}`}>
                  <Avatar name={n.actor.full_name} />
                </Link>
              ) : (
                <Avatar name="S" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-700">
                  {n.actor && (
                    <Link
                      href={`/u/${n.actor.username}`}
                      className="font-semibold text-neutral-900 hover:text-primary-700 transition"
                    >
                      {n.actor.full_name}{" "}
                    </Link>
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

export default function ActivityPage() {
  return (
    <Suspense
      fallback={<AppShell><div className="text-center py-12 text-neutral-600">Loading…</div></AppShell>}
    >
      <ActivityView />
    </Suspense>
  );
}
