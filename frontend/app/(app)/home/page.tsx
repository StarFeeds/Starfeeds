"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { IdeaCard } from "@/components/IdeaCard";
import { MakePostModal } from "@/components/MakePostModal";
import { api } from "@/lib/api/client";
import { Idea } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";

const CATEGORIES = [
  "All",
  "Artificial Intelligence",
  "Climate Tech",
  "Education",
  "Energy",
  "Health",
  "General",
  "Other",
];

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [filterCategory, setFilterCategory] = useState("All");
  const [isPublic, setIsPublic] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const fetchIdeas = async () => {
    setLoading(true);
    setError(null);
    try {
      const cat = filterCategory === "All" ? undefined : filterCategory;
      const resp = await api.ideas.list(1, 10, cat, sort);
      setIdeas(resp.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ideas");
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, filterCategory, authLoading]);

  const handleUpvote = async (ideaId: number) => {
    try {
      const updated = await api.ideas.upvote(ideaId);
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upvote");
    }
  };

  const handleSave = async (ideaId: number) => {
    try {
      const updated = await api.ideas.save(ideaId);
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    );
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <AppShell>
      {/* Composer */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{initial}</span>
          </div>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex-1 h-11 px-4 bg-neutral-100 rounded-full text-sm text-neutral-500 text-left hover:bg-neutral-200 transition"
          >
            Post your idea...
          </button>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 transition flex-shrink-0"
            aria-label="Create post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-bold text-neutral-700">Filter By:</span>
        <label className="flex items-center gap-1.5 text-neutral-600">
          Category
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-transparent font-semibold text-neutral-900 focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-neutral-600">
          Sort By
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "recent" | "top")}
            className="bg-transparent font-semibold text-neutral-900 focus:outline-none cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="top">Most Upvoted</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setIsPublic((v) => !v)}
          className="flex items-center gap-2 text-neutral-600 ml-auto"
        >
          Visibility ({isPublic ? "Public" : "Private"})
          <span
            className={`relative w-9 h-5 rounded-full transition ${
              isPublic ? "bg-primary-600" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition ${
                isPublic ? "left-4" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-destructive-500/10 border border-destructive-500/20 rounded-xl">
          <p className="text-sm text-destructive-500">{error}</p>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading ideas...</div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          No ideas yet. Be the first to share!
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
      )}

      <MakePostModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={fetchIdeas}
      />
    </AppShell>
  );
}
