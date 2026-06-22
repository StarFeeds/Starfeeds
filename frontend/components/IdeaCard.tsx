"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { Idea } from "@/lib/api/types";

interface IdeaCardProps {
  idea: Idea;
  onUpvote: (ideaId: number) => Promise<void>;
  onSave: (ideaId: number) => Promise<void>;
}

export function IdeaCard({ idea, onUpvote, onSave }: IdeaCardProps) {
  const [loading, setLoading] = useState(false);

  const handleUpvote = async () => {
    setLoading(true);
    try {
      await onUpvote(idea.id);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(idea.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {idea.author.username[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-neutral-900">{idea.author.full_name}</h4>
            <p className="text-xs text-neutral-500">@{idea.author.username}</p>
            <p className="text-xs text-neutral-500">Posted 3h ago</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2" />
        </svg>
      </div>

      <h3 className="font-bold text-lg text-neutral-900 mb-2">{idea.title}</h3>

      <div className="inline-block px-2.5 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs font-semibold text-primary-700 mb-3">
        {idea.category.toUpperCase()}
      </div>

      <p className="text-neutral-700 text-sm line-clamp-3 mb-4">
        {idea.body}
        {idea.body.length > 150 && (
          <button className="text-primary-600 hover:text-primary-700 font-semibold"> …more</button>
        )}
      </p>

      <div className="space-y-3 mb-4 p-3 bg-neutral-50 rounded-lg">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="font-bold text-neutral-900">{idea.upvote_count}</p>
            <p className="text-neutral-600">Upvotes</p>
          </div>
          <div>
            <p className="font-bold text-neutral-900">{idea.comment_count || 0}</p>
            <p className="text-neutral-600">Comments</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleUpvote}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
            idea.upvoted_by_me
              ? "bg-primary-600 text-white hover:bg-primary-700"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1m2-1l-2-1m2 1v2.5" />
          </svg>
          Upvote
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold hover:bg-neutral-200 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Comment
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
            idea.saved_by_me
              ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          <svg className="w-4 h-4" fill={idea.saved_by_me ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
