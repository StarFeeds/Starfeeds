"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

/** Admin: one-off "here's what's new" email to members who joined 30+ days
 *  ago and never posted or joined anything. Newer members get the automatic
 *  day-2 / day-7 nudges instead. */
export function CatchUpCard() {
  const [preview, setPreview] = useState<{ eligible: number; email_enabled: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.catchUpPreview().then(setPreview).catch(() => {});
  }, [result]);

  const send = async () => {
    if (!preview?.eligible) return;
    if (!confirm(`Email ${preview.eligible} inactive member${preview.eligible === 1 ? "" : "s"} once with what's new?`)) return;
    setSending(true);
    setError(null);
    try {
      const r = await api.admin.catchUpSend();
      setResult(`Sending to ${r.queued} member${r.queued === 1 ? "" : "s"} now. They won't get this again.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const n = preview?.eligible ?? 0;
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 space-y-3">
      <div>
        <h3 className="font-bold text-neutral-900">Bring back inactive members</h3>
        <p className="text-sm text-neutral-600">
          A one-time &ldquo;here&apos;s what&apos;s new&rdquo; email, with this month&apos;s projects, to members who joined over
          30 days ago and haven&apos;t posted or joined anything. Newer members get two automatic nudges (around day 2
          and day 7), sent with the daily 9 AM job.
        </p>
      </div>
      {result && (
        <div className="p-3 bg-success-500/10 border border-success-500/20 rounded-lg text-sm text-success-500">{result}</div>
      )}
      {error && (
        <div className="p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg text-sm text-destructive-500">{error}</div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-700">
          {preview === null
            ? "Counting…"
            : !preview.email_enabled
              ? "Email isn't configured."
              : n === 0
                ? "Nobody to send to right now."
                : `${n} member${n === 1 ? "" : "s"} will get it.`}
        </span>
        <button
          onClick={send}
          disabled={sending || !n || !preview?.email_enabled}
          className="px-6 h-11 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-semibold rounded-lg transition"
        >
          {sending ? "Sending…" : "Send catch-up email"}
        </button>
      </div>
    </div>
  );
}
