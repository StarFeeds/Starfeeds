"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IdeaCard } from "@/components/IdeaCard";
import { api } from "@/lib/api/client";
import { Idea } from "@/lib/api/types";

export default function SavedPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.ideas.list(1, 50, undefined, "recent", { saved: true });
      setIdeas(resp.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved ideas");
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleUpvote = async (id: number) => {
    try {
      const updated = await api.ideas.upvote(id);
      setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upvote");
    }
  };

  const handleSave = async (id: number) => {
    try {
      const updated = await api.ideas.save(id);
      // Drop it from the list when it is un-saved.
      setIdeas((prev) =>
        updated.saved_by_me ? prev.map((i) => (i.id === id ? updated : i)) : prev.filter((i) => i.id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <AppShell>
      <h1 className="text-lg font-bold text-neutral-900 px-1">Saved Ideas</h1>

      {error && (
        <div className="p-4 bg-destructive-500/10 border border-destructive-500/20 rounded-xl">
          <p className="text-sm text-destructive-500">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading...</div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          You haven&apos;t saved any ideas yet.
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
