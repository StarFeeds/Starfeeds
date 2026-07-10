"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";

const CATEGORIES = [
  "Artificial Intelligence",
  "Climate Tech",
  "Education",
  "Energy",
  "Health",
  "General",
  "Other",
];

interface MakePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * "Make post" modal. The backend's create endpoint only accepts
 * title / body / category / visibility, so the extra design fields
 * (problem, solution, audience, revenue) are composed into the body.
 */
export function MakePostModal({ open, onClose, onCreated }: MakePostModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [revenue, setRevenue] = useState("");
  const [visibility, setVisibility] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setCategory("");
    setProblem("");
    setSolution("");
    setDescription("");
    setAudience("");
    setRevenue("");
    setVisibility("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !problem.trim() || !solution.trim() || !description.trim() || !audience.trim()) {
      setError("Please fill out all required fields.");
      return;
    }
    const body = [
      `**Problem**\n${problem.trim()}`,
      `**Solution**\n${solution.trim()}`,
      `**Description**\n${description.trim()}`,
      `**Target Audience**\n${audience.trim()}`,
      revenue.trim() ? `**Revenue Model**\n${revenue.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    setSubmitting(true);
    setError(null);
    try {
      await api.ideas.create(title.trim(), body, category);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post idea");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
  const areaCls =
    "w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none";
  const labelCls = "block text-sm font-semibold text-neutral-700 mb-1.5";
  const req = <span className="text-destructive-500">*</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-bold text-lg text-neutral-900 uppercase tracking-wide">
            Fill out this form correctly
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg">
              <p className="text-sm text-destructive-500">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Idea Title {req}</label>
              <input
                className={inputCls}
                placeholder="Enter the title of your idea"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Idea Category {req}</label>
              <select
                className={`${inputCls} ${category ? "text-neutral-900" : "text-neutral-500"}`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Problem Statement {req}</label>
              <textarea
                className={areaCls}
                rows={4}
                placeholder="Type problem statement"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Idea Solution {req}</label>
              <textarea
                className={areaCls}
                rows={4}
                placeholder="Type idea solution"
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description {req}</label>
            <textarea
              className={areaCls}
              rows={4}
              placeholder="Describe your idea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Targeted Audience {req}</label>
            <input
              className={inputCls}
              placeholder="Who are your targeted audience?"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Revenue Model (optional)</label>
              <input
                className={inputCls}
                placeholder="What is your revenue model?"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Visibility</label>
              <select
                className={`${inputCls} ${visibility ? "text-neutral-900" : "text-neutral-500"}`}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="" disabled>
                  Select one
                </option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-10 h-12 bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white font-semibold rounded-full transition"
            >
              {submitting ? "Posting..." : "Post Idea"}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
