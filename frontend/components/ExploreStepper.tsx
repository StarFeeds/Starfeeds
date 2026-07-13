"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { Idea } from "@/lib/api/types";
import { Avatar } from "@/components/Avatar";

/** Plain-text preview of an idea body (strip ** markers, collapse whitespace). */
function preview(body: string): string {
  const text = body.replace(/\*\*/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 280 ? text.slice(0, 280).trimEnd() + "…" : text;
}

/**
 * Onboarding "explore" step: shows up to 5 recent ideas (excluding the user's
 * own), one at a time. Completing marks the step done. If there are no other
 * ideas yet (cold start), it completes immediately so no one gets stuck.
 */
export function ExploreStepper({
  open,
  onClose,
  onComplete,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentUserId?: number;
}) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setIndex(0);
    (async () => {
      try {
        const resp = await api.ideas.list(1, 12, undefined, "recent");
        const others = resp.items.filter((i) => i.author.id !== currentUserId).slice(0, 5);
        if (cancelled) return;
        setIdeas(others);
        if (others.length === 0) {
          // Nothing to review yet — auto-complete so the user isn't stuck.
          onComplete();
          onClose();
        }
      } catch {
        if (!cancelled) setIdeas([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUserId]);

  if (!open) return null;

  const total = ideas.length;
  const isLast = index >= total - 1;
  const idea = ideas[index];

  const next = () => {
    if (isLast) {
      onComplete();
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="font-bold text-neutral-900">Explore fresh ideas</h2>
          <button onClick={onClose} aria-label="Close" className="text-neutral-400 hover:text-neutral-700 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading || !idea ? (
          <div className="px-5 py-12 text-center text-neutral-500 text-sm">Loading ideas…</div>
        ) : (
          <>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={idea.author.avatar_url} name={idea.author.full_name ?? idea.author.username} size={40} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-neutral-900 truncate">{idea.author.full_name}</p>
                  <p className="text-xs text-neutral-500 truncate">{idea.author.headline}</p>
                </div>
              </div>
              <h3 className="font-bold text-lg text-neutral-900">{idea.title}</h3>
              <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-2">{idea.category}</p>
              <p className="text-sm text-neutral-700 leading-relaxed">{preview(idea.body)}</p>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-200">
              <div className="flex items-center gap-1.5">
                {ideas.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= index ? "bg-primary-600" : "bg-neutral-300"}`}
                  />
                ))}
                <span className="ml-2 text-xs text-neutral-500">
                  {index + 1}/{total}
                </span>
              </div>
              <button
                onClick={next}
                className="px-6 h-10 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full transition"
              >
                {isLast ? "Done" : "Next"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
