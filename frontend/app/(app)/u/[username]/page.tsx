"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { IdeaCard } from "@/components/IdeaCard";
import { api } from "@/lib/api/client";
import { Idea, PublicUser } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const router = useRouter();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const u = await api.users.get(username);
        if (cancelled) return;
        setProfile(u);
        // If it's me, send to my own profile page instead.
        if (me && u.id === me.id) {
          router.replace("/profile");
          return;
        }
        const resp = await api.ideas.list(1, 50, undefined, "recent", { authorId: u.id });
        if (!cancelled) setIdeas(resp.items);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, me, router]);

  const handleUpvote = async (id: number) => {
    const updated = await api.ideas.upvote(id);
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };
  const handleSave = async (id: number) => {
    const updated = await api.ideas.save(id);
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const message = async () => {
    if (!profile) return;
    setMessaging(true);
    try {
      await api.messages.createConversation(profile.id);
      router.push("/messages");
    } finally {
      setMessaging(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-12 text-neutral-600">Loading…</div>
      </AppShell>
    );
  }
  if (notFound || !profile) {
    return (
      <AppShell>
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          This user doesn&apos;t exist.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5">
        <div className="flex items-start gap-4">
          <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-neutral-900 truncate">{profile.full_name}</h1>
            <p className="text-sm text-neutral-600">{profile.headline}</p>
            {profile.is_online && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 bg-success-500 rounded-full" />
                <span className="text-xs text-neutral-600 font-medium">Online</span>
              </div>
            )}
          </div>
          <button
            onClick={message}
            disabled={messaging}
            className="px-5 h-10 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-semibold rounded-full transition flex-shrink-0"
          >
            {messaging ? "…" : "Message"}
          </button>
        </div>
        {profile.bio?.trim() && (
          <p className="text-sm text-neutral-700 leading-relaxed mt-4 whitespace-pre-line">{profile.bio}</p>
        )}
      </div>

      {/* Their ideas */}
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide px-1 pt-2">
        Ideas ({ideas.length})
      </h2>
      {ideas.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          {profile.full_name?.split(" ")[0] || "This user"} hasn&apos;t posted any ideas yet.
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onUpvote={handleUpvote} onSave={handleSave} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
