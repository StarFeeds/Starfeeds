"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { IdeaCard } from "@/components/IdeaCard";
import { api } from "@/lib/api/client";
import { Idea, IdeaListResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";

export default function HomePage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const resp = await api.ideas.list(page, 10, undefined, sort);
      setIdeas(resp.items);
    } catch (err) {
      console.error("Failed to fetch ideas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, [page, sort]);

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      await api.ideas.create(title, body, category);
      setTitle("");
      setBody("");
      setCategory("General");
      setPage(1);
      await fetchIdeas();
    } catch (err) {
      console.error("Failed to create idea:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (ideaId: number) => {
    try {
      const updated = await api.ideas.upvote(ideaId);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? updated : idea))
      );
    } catch (err) {
      console.error("Failed to upvote:", err);
    }
  };

  const handleSave = async (ideaId: number) => {
    try {
      const updated = await api.ideas.save(ideaId);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? updated : idea))
      );
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Composer */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <form onSubmit={handleCreateIdea} className="flex-1 space-y-4">
                  <input
                    type="text"
                    placeholder="What's your idea?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-lg font-semibold bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none"
                  />
                  <textarea
                    placeholder="Tell us more about your idea..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full bg-transparent text-neutral-700 placeholder-neutral-400 focus:outline-none resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option>General</option>
                      <option>Artificial Intelligence</option>
                      <option>Climate Tech</option>
                      <option>Education</option>
                      <option>Energy</option>
                      <option>Health</option>
                      <option>Other</option>
                    </select>
                    <button
                      type="submit"
                      disabled={submitting || !title.trim() || !body.trim()}
                      className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-lg transition"
                    >
                      {submitting ? "Posting..." : "Post Idea"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Filter & Sort */}
            <div className="flex gap-3">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "recent" | "top")}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="recent">Most Recent</option>
                <option value="top">Most Upvoted</option>
              </select>
            </div>

            {/* Feed */}
            {loading ? (
              <div className="text-center py-12">
                <p className="text-neutral-600">Loading ideas...</p>
              </div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                <p className="text-neutral-600">No ideas yet. Be the first to share!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onUpvote={handleUpvote}
                    onSave={handleSave}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
