"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { IdeaCard } from "@/components/IdeaCard";
import { api } from "@/lib/api/client";
import { Idea } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";

const TABS = ["Past Ideas", "Contributors", "Interests"] as const;
type Tab = (typeof TABS)[number];

const INTERESTS = ["Engineering", "Health Tech", "Artificial Intelligence"];

function ProfileCard({ title, children, edit }: { title: string; children: React.ReactNode; edit?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-neutral-900">{title}</h3>
        {edit && (
          <button className="text-neutral-400 hover:text-neutral-700" aria-label={`Edit ${title}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
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

  const noop = async () => {};

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

      <ProfileCard title="Contact Info" edit>
        <ul className="space-y-2 text-sm text-neutral-600">
          <li className="truncate">{user?.email ?? "you@example.com"}</li>
          <li className="truncate text-primary-600">https://www.facebook.com/{user?.username ?? "you"}</li>
          <li className="truncate text-primary-600">https://www.twitter.com/{user?.username ?? "you"}</li>
        </ul>
      </ProfileCard>

      <ProfileCard title="Bio" edit>
        <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
          {user?.bio?.trim() || "No bio yet. Tell the community about yourself."}
        </p>
      </ProfileCard>

      <ProfileCard title="Interests" edit>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <span
              key={i}
              className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full"
            >
              {i}
            </span>
          ))}
        </div>
      </ProfileCard>

      <ProfileCard title="Collaboration Requests">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">J</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">Jesse Jiwa</p>
            <p className="text-xs text-neutral-500 truncate">wants to collaborate</p>
          </div>
        </div>
      </ProfileCard>
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
          <div className="text-center py-12 text-neutral-600">Loading...</div>
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
                onUpvote={noop}
                onSave={noop}
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
