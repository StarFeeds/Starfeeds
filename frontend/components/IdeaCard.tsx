"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { Comment, Idea } from "@/lib/api/types";

interface IdeaCardProps {
  idea: Idea;
  onUpvote: (ideaId: number) => Promise<void>;
  onSave: (ideaId: number) => Promise<void>;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [div, label] of units) {
    if (value < div) {
      unit = label;
      break;
    }
    value = Math.floor(value / div);
    unit = label;
  }
  return `${value}${unit} ago`;
}

export function IdeaCard({ idea, onUpvote, onSave }: IdeaCardProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(idea.comment_count ?? 0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  // Express interest
  const [interest, setInterest] = useState<"idle" | "sending" | "done">("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) => async () => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0 && commentCount > 0) {
      setCommentsLoading(true);
      try {
        setComments(await api.ideas.listComments(idea.id));
      } catch {
        /* ignore */
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setPosting(true);
    try {
      const c = await api.ideas.addComment(idea.id, draft.trim());
      setComments((prev) => [...prev, c]);
      setCommentCount((n) => n + 1);
      setDraft("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to comment");
    } finally {
      setPosting(false);
    }
  };

  const expressInterest = async () => {
    setInterest("sending");
    setActionError(null);
    try {
      await api.ideas.expressInterest(idea.id);
      setInterest("done");
    } catch (err) {
      setInterest("idle");
      setActionError(err instanceof Error ? err.message : "Failed to express interest");
    }
  };

  const isLong = idea.body.length > 150;
  const bodyText = expanded || !isLong ? idea.body : idea.body.slice(0, 150).trimEnd();

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5">
      {/* Author row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {idea.author.username[0].toUpperCase()}
              </span>
            </div>
            {idea.author.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-neutral-900 leading-tight">{idea.author.full_name}</h4>
            <p className="text-xs text-neutral-600">{idea.author.headline}</p>
            <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
              Posted {timeAgo(idea.created_at)}
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </p>
          </div>
        </div>
        <button className="text-neutral-400 hover:text-neutral-700 transition p-1">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* Title + category */}
      <h3 className="font-bold text-lg text-neutral-900 mb-1">{idea.title}</h3>
      <p className="text-xs font-bold text-secondary-700 uppercase tracking-wide mb-3">
        {idea.category}
      </p>

      {/* Body */}
      <p className="text-neutral-700 text-sm leading-relaxed mb-4">
        {bodyText}
        {isLong && !expanded && "… "}
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            {expanded ? " less" : "more"}
          </button>
        )}
      </p>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-neutral-600 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 21h2V9H2v12zm20-11a2 2 0 00-2-2h-6.31l.95-4.57.03-.32a1.5 1.5 0 00-.44-1.06L13.17 1 6.59 7.59A2 2 0 006 9v10a2 2 0 002 2h9a2 2 0 001.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1z" />
            </svg>
          </span>
          <span className="font-semibold text-neutral-900">{idea.upvote_count}</span>
        </div>
        <button onClick={toggleComments} className="hover:text-neutral-900 transition">
          {commentCount} Comments
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
        <button
          onClick={run(() => onUpvote(idea.id))}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
            idea.upvoted_by_me
              ? "text-primary-600"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <svg className="w-5 h-5" fill={idea.upvoted_by_me ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Upvote
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Comment
        </button>
        <button
          onClick={expressInterest}
          disabled={interest !== "idle"}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
            interest === "done"
              ? "text-success-500"
              : "text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.5" />
          </svg>
          {interest === "done" ? "Interested" : interest === "sending" ? "Sending..." : "Express Interest"}
        </button>
        <button
          onClick={run(() => onSave(idea.id))}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
            idea.saved_by_me ? "text-primary-600" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <svg className="w-5 h-5" fill={idea.saved_by_me ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Save
        </button>
      </div>

      {actionError && (
        <p className="text-xs text-destructive-500 mt-2">{actionError}</p>
      )}

      {/* Comment thread */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-4">
          {commentsLoading ? (
            <p className="text-sm text-neutral-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-neutral-500">No comments yet. Start the conversation.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {c.author.full_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 bg-neutral-50 rounded-xl px-3 py-2">
                    <p className="text-sm font-semibold text-neutral-900">{c.author.full_name}</p>
                    <p className="text-sm text-neutral-700">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={postComment} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 h-10 px-4 bg-neutral-100 rounded-full text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              className="px-4 h-10 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-semibold rounded-full transition"
            >
              {posting ? "..." : "Post"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
