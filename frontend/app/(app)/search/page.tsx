"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { IdeaCard } from "@/components/IdeaCard";
import { api } from "@/lib/api/client";
import { Idea, PublicUser } from "@/lib/api/types";

function SearchResultsView() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState<number | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setIdeas([]);
      setUsers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await api.search(q, 20);
        if (!cancelled) {
          setIdeas(r.ideas);
          setUsers(r.users);
        }
      } catch {
        if (!cancelled) {
          setIdeas([]);
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const handleUpvote = async (id: number) => {
    const updated = await api.ideas.upvote(id);
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };
  const handleSave = async (id: number) => {
    const updated = await api.ideas.save(id);
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const messageUser = async (userId: number) => {
    setMessaging(userId);
    try {
      await api.messages.createConversation(userId);
      router.push("/messages");
    } finally {
      setMessaging(null);
    }
  };

  const total = ideas.length + users.length;

  return (
    <>
      <h1 className="text-lg font-bold text-neutral-900 px-1">
        {q.trim() ? (
          <>
            Results for <span className="text-primary-600">“{q.trim()}”</span>
          </>
        ) : (
          "Search"
        )}
      </h1>

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Searching…</div>
      ) : !q.trim() ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          Type something in the search bar to find ideas and people.
        </div>
      ) : total === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          No results for “{q.trim()}”.
        </div>
      ) : (
        <div className="space-y-6">
          {users.length > 0 && (
            <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                People ({users.length})
              </h2>
              <div className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-3">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{u.full_name[0]}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{u.full_name}</p>
                      <p className="text-xs text-neutral-500 truncate">{u.headline}</p>
                    </div>
                    <button
                      onClick={() => messageUser(u.id)}
                      disabled={messaging === u.id}
                      className="px-4 h-9 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-semibold rounded-full transition flex-shrink-0"
                    >
                      {messaging === u.id ? "…" : "Message"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {ideas.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide px-1">
                Ideas ({ideas.length})
              </h2>
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onUpvote={handleUpvote} onSave={handleSave} />
              ))}
            </section>
          )}
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="text-center py-12 text-neutral-600">Loading…</div>}>
        <SearchResultsView />
      </Suspense>
    </AppShell>
  );
}
