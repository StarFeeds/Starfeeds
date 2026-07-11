"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { api } from "@/lib/api/client";
import {
  Conversation,
  Message,
  CollaborationRequest,
} from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";
import { useRealtime } from "@/lib/context/realtime";

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0"
    >
      <span className="text-white text-sm font-bold">{name?.[0] ?? "?"}</span>
    </div>
  );
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [collab, setCollab] = useState<CollaborationRequest[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { subscribe, setUnreadMessages } = useRealtime();

  // Refs so the WS handler always sees current values without re-subscribing.
  const activeIdRef = useRef<number | null>(null);
  const convosRef = useRef<Conversation[]>([]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    convosRef.current = conversations;
  }, [conversations]);

  // Load conversations + incoming collaboration requests.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [convos, reqs] = await Promise.all([
          api.messages.listConversations(),
          api.collaboration.list("incoming"),
        ]);
        if (cancelled) return;
        setConversations(convos);
        setCollab(reqs.filter((r) => r.status === "pending"));
        if (convos.length) setActiveId(convos[0].id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load messages when the active conversation changes; clear its unread count.
  useEffect(() => {
    if (activeId == null) return;
    let cancelled = false;
    (async () => {
      const msgs = await api.messages.listMessages(activeId); // marks read server-side
      if (cancelled) return;
      setMessages(msgs);
      const had = convosRef.current.find((c) => c.id === activeId)?.unread || 0;
      if (had > 0) setUnreadMessages((c) => Math.max(0, c - had));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, setUnreadMessages]);

  // Live incoming messages over the WebSocket.
  useEffect(() => {
    return subscribe((event) => {
      if (event.type !== "message") return;
      const { conversation_id, message } = event;
      const isActive = conversation_id === activeIdRef.current;

      if (isActive) {
        setMessages((prev) => [...prev, message]);
        setUnreadMessages((c) => Math.max(0, c - 1)); // cancel the provider's bump — we're viewing it
      }

      if (!convosRef.current.some((c) => c.id === conversation_id)) {
        // A conversation we don't know about yet — refetch the list.
        api.messages.listConversations().then(setConversations).catch(() => {});
        return;
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversation_id
            ? {
                ...c,
                last_message: message.body,
                last_time: message.created_at,
                unread: isActive ? 0 : (c.unread || 0) + 1,
              }
            : c
        )
      );
    });
  }, [subscribe, setUnreadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || activeId == null) return;
    const body = draft.trim();
    setDraft("");
    const msg = await api.messages.send(activeId, body);
    setMessages((prev) => [...prev, msg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, last_message: msg.body, last_time: msg.created_at }
          : c
      )
    );
  };

  const resolveCollab = async (id: number, accept: boolean) => {
    setCollab((prev) => prev.filter((r) => r.id !== id));
    try {
      if (accept) {
        const res = await api.collaboration.accept(id);
        if (res.conversation_id != null) {
          // Refresh the inbox so the new conversation appears, then open it.
          const convos = await api.messages.listConversations();
          setConversations(convos);
          setActiveId(res.conversation_id);
        }
      } else {
        await api.collaboration.decline(id);
      }
    } catch {
      /* optimistic */
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-4 items-stretch h-[calc(100vh-64px)]">
        {/* Left: people + collab requests. On mobile, hidden once a chat is open. */}
        <div
          className={`${activeId ? "hidden md:flex" : "flex"} flex-col gap-4 w-full md:w-80 flex-shrink-0 overflow-y-auto`}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
            <h2 className="font-bold text-neutral-900 mb-3">People</h2>
            {loading ? (
              <p className="text-sm text-neutral-500 py-4">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4">No conversations yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full flex items-center gap-3 py-3 text-left rounded-lg px-2 transition ${
                      activeId === c.id ? "bg-primary-50/60" : "hover:bg-neutral-50"
                    }`}
                  >
                    <Avatar name={c.other_user.full_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-neutral-900 truncate">
                          {c.other_user.full_name}
                        </p>
                        <span className="text-xs text-neutral-500 flex-shrink-0">
                          {timeLabel(c.last_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-neutral-500 truncate">
                          {c.last_message ?? "No messages yet"}
                        </p>
                        {c.unread > 0 && (
                          <span className="flex-shrink-0 w-4 h-4 bg-destructive-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {collab.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
              <h2 className="font-bold text-neutral-900 mb-3">Collaboration Requests</h2>
              <div className="space-y-4">
                {collab.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar name={r.from_user.full_name} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-neutral-900 truncate">
                          {r.from_user.full_name}
                        </p>
                        <p className="text-xs text-neutral-500">{r.from_user.headline}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveCollab(r.id, true)}
                        className="flex-1 h-9 bg-success-500 hover:opacity-90 text-white text-sm font-semibold rounded-full transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => resolveCollab(r.id, false)}
                        className="flex-1 h-9 border border-destructive-500 text-destructive-500 hover:bg-destructive-500/5 text-sm font-semibold rounded-full transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: chat. On mobile, only shown once a conversation is open. */}
        <div
          className={`${activeId ? "flex" : "hidden md:flex"} flex-1 min-w-0 bg-white rounded-2xl border border-neutral-200 shadow-xs flex-col`}
        >
          {active ? (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveId(null)}
                    className="md:hidden -ml-1 p-1 text-neutral-600 hover:text-neutral-900 flex-shrink-0"
                    aria-label="Back to conversations"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <Avatar name={active.other_user.full_name} size={44} />
                  <div>
                    <p className="font-bold text-neutral-900 leading-tight">
                      {active.other_user.full_name}
                    </p>
                    <p className="text-xs text-neutral-600">{active.other_user.headline}</p>
                    <p className="text-xs text-neutral-500">
                      {active.other_user.is_online ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      <div
                        className={`max-w-[70%] px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-primary-600 text-white rounded-2xl rounded-br-sm"
                            : "bg-neutral-100 text-neutral-800 rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {m.body}
                      </div>
                      <span className="text-xs text-neutral-400 mt-1">{timeLabel(m.created_at)}</span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={send} className="flex items-center gap-3 px-5 py-4 border-t border-neutral-200">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 h-12 px-4 bg-neutral-100 rounded-full text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="w-12 h-12 rounded-full bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white flex items-center justify-center transition flex-shrink-0"
                  aria-label="Send"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
              {loading ? "Loading..." : "Select a conversation to start chatting."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
