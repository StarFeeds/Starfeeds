"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";

export default function AdminAnnouncementsPage() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    if (!confirm("Send this announcement to every user?")) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const r = await api.admin.announce(body);
      setResult(`Delivered to ${r.delivered} user${r.delivered === 1 ? "" : "s"}.`);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 space-y-3">
      <div>
        <h3 className="font-bold text-neutral-900">Broadcast announcement</h3>
        <p className="text-sm text-neutral-600">
          Sends an in-app notification to every user. (Email broadcast comes later.)
        </p>
      </div>

      {result && (
        <div className="p-3 bg-success-500/10 border border-success-500/20 rounded-lg text-sm text-success-500">{result}</div>
      )}
      {error && (
        <div className="p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg text-sm text-destructive-500">{error}</div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="e.g. We just shipped profile pictures — add yours in Edit Profile!"
        className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">{text.length}/500</span>
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="px-6 h-11 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-semibold rounded-lg transition"
        >
          {sending ? "Sending…" : "Send to all users"}
        </button>
      </div>
    </div>
  );
}
