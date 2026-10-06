"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

const CATEGORIES = [
  "Artificial Intelligence",
  "Climate Tech",
  "Education",
  "Energy",
  "Health",
  "Other",
];

/** Optional structured prompts, folded behind "Add more detail". */
const DETAIL_FIELDS = [
  { key: "problem", heading: "Problem", placeholder: "What problem are you solving?" },
  { key: "audience", heading: "Target Audience", placeholder: "Who is it for?" },
  { key: "revenue", heading: "Revenue Model", placeholder: "How could it make money?" },
] as const;

type DetailKey = (typeof DETAIL_FIELDS)[number]["key"];
type Visibility = "public" | "private";

const EMPTY_DETAILS: Record<DetailKey, string> = { problem: "", audience: "", revenue: "" };

interface MakePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * "Share what you're working on" composer. Only a title and a short
 * description are required; category, visibility and the structured
 * details are optional. The backend stores title / body / category /
 * visibility, so any filled-in details are appended to the body as
 * headed sections.
 */
export function MakePostModal({ open, onClose, onCreated }: MakePostModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canPost = title.trim() !== "" && description.trim() !== "";

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory(null);
    setVisibility("public");
    setShowDetails(false);
    setDetails(EMPTY_DETAILS);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) {
      setError("Add a name and a short description to post.");
      return;
    }
    const body = [
      description.trim(),
      ...DETAIL_FIELDS.map(({ key, heading }) =>
        details[key].trim() ? `**${heading}**\n${details[key].trim()}` : null,
      ),
    ]
      .filter(Boolean)
      .join("\n\n");

    setSubmitting(true);
    setError(null);
    try {
      await api.ideas.create(title.trim(), body, category ?? "General", visibility);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post idea");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls =
    "w-full px-4 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4 py-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-bold text-lg text-neutral-900">
            Share what you&apos;re working on
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

          <input
            autoFocus
            aria-label="Project name"
            className={`${fieldCls} h-12 text-base font-semibold placeholder:font-normal`}
            placeholder="Give it a name, e.g. Uber for laundry in Lagos"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            aria-label="Description"
            className={`${fieldCls} py-3 resize-none`}
            rows={4}
            placeholder="What are you building, and who's it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-2">Category (optional)</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(active ? null : c)}
                    className={`px-3 h-8 rounded-full text-sm border transition ${
                      active
                        ? "bg-primary-700 border-primary-700 text-white"
                        : "border-neutral-300 text-neutral-700 hover:border-primary-500 hover:text-primary-700"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <button
              type="button"
              aria-expanded={showDetails}
              onClick={() => setShowDetails((s) => !s)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-600 transition"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showDetails ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Add more detail
              <span className="font-normal text-neutral-500">(problem, audience, revenue)</span>
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                {DETAIL_FIELDS.map(({ key, heading, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1">{heading}</label>
                    <input
                      className={`${fieldCls} h-11`}
                      placeholder={placeholder}
                      value={details[key]}
                      onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100">
            <select
              aria-label="Who can see this"
              className="h-10 pl-3 pr-8 mt-3 rounded-full border border-neutral-300 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
            >
              <option value="public">Everyone</option>
              <option value="private">Members only</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !canPost}
              className="inline-flex items-center gap-2 px-8 h-11 mt-3 bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-full transition"
            >
              {submitting ? "Posting..." : "Post"}
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
