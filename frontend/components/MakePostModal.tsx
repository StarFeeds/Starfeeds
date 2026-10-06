"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Idea } from "@/lib/api/types";
import { DETAIL_FIELDS, EMPTY_DETAILS, composeBody, splitBody } from "@/lib/ideaBody";

const CATEGORIES = [
  "Artificial Intelligence",
  "Climate Tech",
  "Education",
  "Energy",
  "Health",
  "Other",
];

type Visibility = "public" | "private";

interface MakePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  /** When set, the modal edits this idea instead of creating a new one.
   *  Mount it only while open so it picks up the idea's current values. */
  idea?: Idea;
  onSaved?: (idea: Idea) => void;
}

/**
 * "Share what you're working on" composer. Only a title and a short
 * description are required; category, visibility and the structured
 * details are optional. The backend stores title / body / category /
 * visibility / project_url, so any filled-in details are appended to the
 * body as headed sections.
 */
export function MakePostModal({ open, onClose, onCreated, idea, onSaved }: MakePostModalProps) {
  const editing = !!idea;
  // When editing, the modal is mounted on open, so the idea seeds initial state.
  const [initial] = useState(() => (idea ? splitBody(idea.body) : null));
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectUrl, setProjectUrl] = useState(idea?.project_url ?? "");
  const [category, setCategory] = useState<string | null>(
    idea && CATEGORIES.includes(idea.category) ? idea.category : null,
  );
  const [visibility, setVisibility] = useState<Visibility>(
    idea?.visibility === "private" ? "private" : "public",
  );
  const [details, setDetails] = useState(initial?.details ?? EMPTY_DETAILS);
  const [showDetails, setShowDetails] = useState(
    !!initial && Object.values(initial.details).some(Boolean),
  );
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
    setProjectUrl("");
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
    const input = {
      title: title.trim(),
      body: composeBody(description, details),
      // Keep a category we don't offer as a chip (e.g. older posts) unless changed.
      category: category ?? (idea && !CATEGORIES.includes(idea.category) ? idea.category : "General"),
      visibility,
      project_url: projectUrl.trim(),
    };

    setSubmitting(true);
    setError(null);
    try {
      if (idea) {
        onSaved?.(await api.ideas.update(idea.id, input));
      } else {
        await api.ideas.create({ ...input, project_url: input.project_url || null });
        reset();
        onCreated?.();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : editing ? "Failed to save changes" : "Failed to post idea");
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
            {editing ? "Edit your idea" : <>Share what you&apos;re working on</>}
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

          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <input
              type="text"
              inputMode="url"
              aria-label="Project link"
              className={`${fieldCls} h-11 pl-10`}
              placeholder="Link to your project, if it's live (optional)"
              maxLength={500}
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
            />
          </div>

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
              {submitting ? (editing ? "Saving..." : "Posting...") : editing ? "Save changes" : "Post"}
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
