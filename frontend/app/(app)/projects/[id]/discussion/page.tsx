"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/api/client";
import { GroupMessage, GroupSummary, PublicUser } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";
import { useRealtime } from "@/lib/context/realtime";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ProjectDiscussionPage() {
  const params = useParams<{ id: string }>();
  const ideaId = Number(params.id);
  const { user } = useAuth();
  const { subscribe } = useRealtime();

  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ideaId) return;
    let cancelled = false;
    (async () => {
      try {
        const myGroups = await api.groups.myGroups();
        const g = myGroups.find((x) => x.idea_id === ideaId);
        if (!g) {
          if (!cancelled) setDenied(true);
          return;
        }
        const [mem, msgs] = await Promise.all([
          api.groups.members(ideaId),
          api.groups.listMessages(ideaId),
        ]);
        if (cancelled) return;
        setGroup(g);
        setMembers(mem);
        setMessages(msgs);
      } catch {
        if (!cancelled) setDenied(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ideaId]);

  // Live group messages for this project.
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "group_message" && event.idea_id === ideaId) {
        setMessages((prev) =>
          prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message]
        );
      }
    });
  }, [subscribe, ideaId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const msg = await api.groups.sendMessage(ideaId, body);
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6 h-[calc(100vh-64px)]">
        {loading ? (
          <div className="text-center py-12 text-neutral-600">Loading…</div>
        ) : denied ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200">
            <p className="text-neutral-600 mb-3">
              You&apos;re not a member of this project&apos;s group.
            </p>
            <Link
              href="/home"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Back to projects
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-200">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="font-bold text-neutral-900 truncate">{group?.title}</h1>
                  <p className="text-xs text-neutral-500">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </p>
                </div>
                <div className="flex -space-x-2 flex-shrink-0">
                  {members.slice(0, 6).map((m) => (
                    <Link key={m.id} href={`/u/${m.username}`} className="ring-2 ring-white rounded-full">
                      <Avatar src={m.avatar_url} name={m.full_name} size={28} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-neutral-500 py-8">
                  No messages yet — say hello to your group 👋
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                      {!mine && (
                        <Link href={`/u/${m.sender.username}`} className="flex-shrink-0 self-end">
                          <Avatar src={m.sender.avatar_url} name={m.sender.full_name} size={28} />
                        </Link>
                      )}
                      <div className={`flex flex-col ${mine ? "items-end" : "items-start"} max-w-[75%]`}>
                        {!mine && (
                          <span className="text-xs font-semibold text-neutral-600 mb-0.5">
                            {m.sender.full_name}
                          </span>
                        )}
                        <div
                          className={`px-4 py-2.5 text-sm ${
                            mine
                              ? "bg-primary-600 text-white rounded-2xl rounded-br-sm"
                              : "bg-neutral-100 text-neutral-800 rounded-2xl rounded-bl-sm"
                          }`}
                        >
                          {m.body}
                        </div>
                        <span className="text-xs text-neutral-400 mt-1">{timeLabel(m.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <form onSubmit={send} className="flex items-center gap-3 px-5 py-4 border-t border-neutral-200">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the group…"
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
          </div>
        )}
      </div>
    </div>
  );
}
