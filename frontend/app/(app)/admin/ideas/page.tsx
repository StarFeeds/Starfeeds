"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { AdminIdea } from "@/lib/api/types";

export default function AdminIdeasPage() {
  const [q, setQ] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [ideas, setIdeas] = useState<AdminIdea[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async (query: string, hidden: boolean) => {
    setLoading(true);
    try {
      const r = await api.admin.listIdeas(query, {
        hidden: hidden ? true : undefined,
        pageSize: 50,
      });
      setIdeas(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(q.trim(), onlyHidden), 250);
    return () => clearTimeout(t);
  }, [q, onlyHidden]);

  const toggleHidden = async (i: AdminIdea) => {
    setBusy(i.id);
    try {
      const updated = await api.admin.setIdeaHidden(i.id, !i.hidden);
      setIdeas((prev) => prev.map((x) => (x.id === i.id ? { ...x, hidden: updated.hidden } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (i: AdminIdea) => {
    if (!confirm(`Delete "${i.title}" permanently? This cannot be undone.`)) return;
    setBusy(i.id);
    try {
      await api.admin.deleteIdea(i.id);
      setIdeas((prev) => prev.filter((x) => x.id !== i.id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ideas by title, body or category"
          className="flex-1 px-4 h-11 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={() => setOnlyHidden((v) => !v)}
          className={`px-4 h-11 rounded-xl text-sm font-semibold border transition flex-shrink-0 ${
            onlyHidden ? "bg-primary-50 text-primary-700 border-primary-200" : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          {onlyHidden ? "Showing hidden only" : "Show hidden only"}
        </button>
      </div>
      <p className="text-xs text-neutral-500 px-1">{total} idea{total === 1 ? "" : "s"}</p>

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {ideas.map((i) => (
            <div key={i.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-900 truncate">{i.title}</span>
                  {i.hidden && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-neutral-200 text-neutral-600">HIDDEN</span>}
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  {i.category} · by {i.author.full_name} · {i.upvote_count} upvotes · {i.comment_count} comments
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleHidden(i)}
                  disabled={busy === i.id}
                  className="px-3 h-8 rounded-full text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition"
                >
                  {i.hidden ? "Unhide" : "Hide"}
                </button>
                <button
                  onClick={() => remove(i)}
                  disabled={busy === i.id}
                  className="px-3 h-8 rounded-full text-xs font-semibold border border-destructive-500 text-destructive-500 hover:bg-destructive-500/5 disabled:opacity-40 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {ideas.length === 0 && <p className="text-center py-8 text-sm text-neutral-500">No ideas found.</p>}
        </div>
      )}
    </div>
  );
}
