"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { Notification } from "@/lib/api/types";
import { useRealtime } from "@/lib/context/realtime";

type NotifType = Notification["type"];

const ICONS: Record<NotifType, React.ReactNode> = {
  comment: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-4 4z" />
  ),
  upvote: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  ),
  collab: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
  ),
  mention: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9" />
  ),
  system: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
  ),
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

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, setUnreadNotifications } = useRealtime();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.notifications.list();
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prepend notifications that arrive live over the WebSocket.
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "notification") {
        setItems((prev) => [event.notification, ...prev]);
      }
    });
  }, [subscribe]);

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifications(0);
    try {
      await api.notifications.markAllRead();
    } catch {
      /* optimistic; ignore */
    }
  };

  const markOne = async (id: number) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          wasUnread = !i.read;
          return { ...i, read: true };
        }
        return i;
      })
    );
    if (wasUnread) setUnreadNotifications((c) => Math.max(0, c - 1));
    try {
      await api.notifications.markRead(id);
    } catch {
      /* optimistic; ignore */
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">
          Notifications {unread > 0 && <span className="text-primary-600">({unread})</span>}
        </h1>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive-500/10 border border-destructive-500/20 rounded-xl">
          <p className="text-sm text-destructive-500">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          No notifications yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => markOne(n.id)}
              className={`w-full flex items-start gap-3 px-5 py-4 text-left transition hover:bg-neutral-50 ${
                n.read ? "" : "bg-primary-50/40"
              }`}
            >
              <span className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {ICONS[n.type]}
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-700">
                  {n.actor && (
                    <span className="font-semibold text-neutral-900">{n.actor.full_name} </span>
                  )}
                  {n.text}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <span className="w-2.5 h-2.5 bg-primary-600 rounded-full flex-shrink-0 mt-1.5" />}
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
