"use client";

import { useEffect, useState } from "react";
import type { Idea } from "@/lib/api/types";

/**
 * "Request to join" with a short note. Owners decide on the note, so we
 * nudge people to say what they'd bring (optional, but it gets accepted).
 */
export function JoinRequestModal({
  idea,
  onClose,
  onSubmit,
}: {
  idea: Pick<Idea, "title" | "looking_for" | "author">;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}) {
  const [role, setRole] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = (idea.author.full_name || "the founder").split(" ")[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = [role ? `Joining as: ${role}.` : "", note.trim()].filter(Boolean).join(" ");
    setSending(true);
    setError(null);
    try {
      await onSubmit(message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-neutral-900/40 p-4 py-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form onSubmit={send} className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 space-y-4">
        <div>
          <h2 className="font-bold text-lg text-neutral-900">Ask to join {idea.title}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {`Tell ${firstName} what you'd bring. A specific note gets accepted much more often.`}
          </p>
        </div>

        {error && <p className="text-sm text-destructive-500">{error}</p>}

        {idea.looking_for?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-2">I&apos;d join as</p>
            <div className="flex flex-wrap gap-2">
              {idea.looking_for.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => setRole(role === r ? null : r)}
                  className={`px-3 h-8 rounded-full text-sm border transition ${
                    role === r
                      ? "bg-primary-700 border-primary-700 text-white"
                      : "border-neutral-300 text-neutral-700 hover:border-primary-500 hover:text-primary-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <textarea
          autoFocus
          aria-label="Your note"
          rows={4}
          maxLength={450}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I'm a React developer with 4 years in fintech. I can build the dashboard."
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-10 rounded-full text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="px-6 h-10 rounded-full bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white text-sm font-semibold transition"
          >
            {sending ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </div>
  );
}
