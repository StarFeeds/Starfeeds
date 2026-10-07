"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function AdminAnnouncementsPage() {
  const [text, setText] = useState("");
  const [email, setEmail] = useState(true);
  const [audience, setAudience] = useState<{ in_app: number; email: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.announcementAudience().then(setAudience).catch(() => {});
  }, []);

  const emailAvailable = (audience?.email ?? 0) > 0;
  const willEmail = email && emailAvailable;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const who = audience ? plural(audience.in_app, "user") : "every user";
    if (!confirm(`Send this announcement to ${who}${willEmail ? " in the app and by email" : " in the app"}?`)) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const r = await api.admin.announce(body, willEmail);
      setResult(
        `Delivered in the app to ${plural(r.delivered, "user")}.` +
          (r.emailing ? ` Emailing ${plural(r.emailing, "person")} now; this takes about ${Math.max(1, Math.ceil((r.emailing * 0.6) / 60))} min.` : ""),
      );
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
          Goes to everyone with announcements on{audience ? ` (${plural(audience.in_app, "user")})` : ""}: an in-app
          notification, live for anyone online, plus an optional email.
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
      <p className="text-xs text-neutral-500">The first line becomes the email subject.</p>

      <label className={`flex items-center gap-2 text-sm ${emailAvailable ? "text-neutral-700" : "text-neutral-400"}`}>
        <input
          type="checkbox"
          checked={willEmail}
          disabled={!emailAvailable}
          onChange={(e) => setEmail(e.target.checked)}
          className="w-4 h-4 accent-primary-700"
        />
        Also send by email
        {audience && (emailAvailable ? ` (${plural(audience.email, "person")})` : " (email isn't configured)")}
      </label>

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
