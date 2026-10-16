"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { IdeaCard } from "@/components/IdeaCard";
import { api } from "@/lib/api/client";
import { CollaborationRequest, Idea } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";
import { FeedSkeleton } from "@/components/Skeleton";

const TABS = ["Past Ideas", "Contributors", "Interests"] as const;
type Tab = (typeof TABS)[number];

function ProfileCard({ title, children, editHref }: { title: string; children: React.ReactNode; editHref?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-neutral-900">{title}</h3>
        {editHref && (
          <Link href={editHref} className="text-neutral-400 hover:text-neutral-700" aria-label={`Edit ${title}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/** Pending join requests on your projects, answerable right here. */
function RequestsCard() {
  const [requests, setRequests] = useState<CollaborationRequest[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.collaboration
      .list("incoming")
      .then((rs) => !cancelled && setRequests(rs.filter((r) => r.status === "pending")))
      .catch(() => !cancelled && setRequests([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const resolve = async (r: CollaborationRequest, accept: boolean) => {
    setBusy(r.id);
    setNotice(null);
    try {
      if (accept) await api.collaboration.accept(r.id);
      else await api.collaboration.decline(r.id);
      setRequests((prev) => (prev ?? []).filter((x) => x.id !== r.id));
      setNotice(accept ? `${r.from_user.full_name} joined your project group.` : "Request declined.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const shown = (requests ?? []).slice(0, 3);
  const more = (requests?.length ?? 0) - shown.length;
  return (
    <ProfileCard title="Collaboration Requests">
      {notice && <p className="mb-3 text-xs font-semibold text-primary-700">{notice}</p>}
      {requests === null ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No requests waiting. When someone asks to join your project, you can accept them here.
        </p>
      ) : (
        <ul className="space-y-4">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/u/${r.from_user.username}`} className="flex items-center gap-3 group">
                <Avatar src={r.from_user.avatar_url} name={r.from_user.full_name} size={36} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-700">
                    {r.from_user.full_name}
                  </span>
                  <span className="block text-xs text-neutral-500 truncate">
                    wants to join {r.idea_title ?? "your project"}
                  </span>
                </span>
              </Link>
              {r.message && (
                <p className="mt-1.5 text-xs text-neutral-700 bg-neutral-50 border-l-2 border-primary-300 rounded px-2 py-1 line-clamp-3">
                  {r.message}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => resolve(r, true)}
                  disabled={busy === r.id}
                  className="flex-1 h-8 rounded-full bg-success-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => resolve(r, false)}
                  disabled={busy === r.id}
                  className="flex-1 h-8 rounded-full border border-destructive-500 text-destructive-500 hover:bg-destructive-500/5 disabled:opacity-50 text-xs font-semibold transition"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(requests?.length ?? 0) > 0 && (
        <Link href="/activity?tab=collab" className="mt-4 block text-xs font-semibold text-primary-700 hover:text-primary-600">
          {more > 0 ? `View all requests (+${more} more) →` : "View all requests →"}
        </Link>
      )}
    </ProfileCard>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Past Ideas");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!user) {
          if (!cancelled) setIdeas([]);
          return;
        }
        const resp = await api.ideas.list(1, 50, undefined, "recent", {
          authorId: user.id,
        });
        if (!cancelled) setIdeas(resp.items);
      } catch {
        if (!cancelled) setIdeas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleUpvote = async (id: number) => {
    const updated = await api.ideas.upvote(id);
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };
  const handleSave = async (id: number) => {
    const updated = await api.ideas.save(id);
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const sidebar = (
    <aside className="flex flex-col gap-4 w-full md:w-72 flex-shrink-0">
      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar_url} name={user?.full_name ?? user?.username} size={48} />
          <div className="min-w-0">
            <h3 className="font-bold text-neutral-900 truncate">{user?.full_name ?? "Your name"}</h3>
            <p className="text-sm text-neutral-600 truncate">{user?.headline ?? "Member"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 bg-success-500 rounded-full" />
              <span className="text-xs text-neutral-600 font-medium">Online</span>
            </div>
          </div>
        </div>
        <Link
          href="/profile/edit"
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-semibold rounded-full hover:bg-neutral-50 transition"
        >
          Edit Profile
        </Link>
      </div>

      <ProfileCard title="Contact Info" editHref="/settings">
        <ul className="space-y-2 text-sm text-neutral-600">
          <li className="truncate">{user?.email}</li>
          <li className="truncate">
            {user?.phone ? (
              <>WhatsApp: {user.phone}</>
            ) : (
              <Link href="/settings" className="text-primary-700 font-semibold hover:text-primary-600">
                Add your WhatsApp number
              </Link>
            )}
          </li>
        </ul>
      </ProfileCard>

      <ProfileCard title="Bio" editHref="/profile/edit">
        <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
          {user?.bio?.trim() || "No bio yet. Tell the community about yourself."}
        </p>
      </ProfileCard>

      <RequestsCard />
    </aside>
  );

  return (
    <AppShell sidebar={sidebar}>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-lg text-neutral-900">Activities</h2>
          <div className="flex items-center gap-1 bg-neutral-100 rounded-full p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  tab === t ? "bg-white text-primary-700 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "Past Ideas" &&
        (loading ? (
          <FeedSkeleton />
        ) : ideas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
            You haven&apos;t posted any ideas yet.
          </div>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onUpvote={handleUpvote}
                onSave={handleSave}
                onDelete={(id) => setIdeas((prev) => prev.filter((i) => i.id !== id))}
              />
            ))}
          </div>
        ))}

      {tab === "Contributors" && (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          No contributors yet.
        </div>
      )}

      {tab === "Interests" && (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          Ideas you&apos;re interested in will appear here.
        </div>
      )}
    </AppShell>
  );
}
