"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";

const SIZES = ["Under 100", "100–500", "500–2,000", "2,000+"];

const input =
  "w-full h-11 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500";

export function PartnerForm() {
  const [form, setForm] = useState({ name: "", organisation: "", role: "", email: "", phone: "", community_size: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
      await api.partners.interest(clean as unknown as Parameters<typeof api.partners.interest>[0]);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-6">
        <h3 className="font-bold text-neutral-900">Thanks, {form.name.split(" ")[0]}. We&apos;ve got it.</h3>
        <p className="mt-1 text-neutral-700">We&apos;ll be in touch within two working days to plan your pilot.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Your name *</span>
        <input required value={form.name} onChange={set("name")} className={`${input} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Organisation *</span>
        <input required value={form.organisation} onChange={set("organisation")} placeholder="Hub, bootcamp, accelerator…" className={`${input} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Email *</span>
        <input required type="email" value={form.email} onChange={set("email")} className={`${input} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Phone / WhatsApp</span>
        <input type="tel" value={form.phone} onChange={set("phone")} className={`${input} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Your role</span>
        <input value={form.role} onChange={set("role")} placeholder="e.g. Community lead" className={`${input} mt-1.5`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Community size</span>
        <select value={form.community_size} onChange={set("community_size")} className={`${input} mt-1.5 bg-white`}>
          <option value="">Choose…</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-neutral-700">What would success look like for you?</span>
        <textarea
          value={form.message}
          onChange={set("message")}
          rows={4}
          maxLength={2000}
          placeholder="e.g. Get our latest cohort into project teams before demo day"
          className="w-full mt-1.5 px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
        />
      </label>
      {error && <p className="sm:col-span-2 text-sm text-destructive-500">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={sending}
          className="h-12 px-8 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold"
        >
          {sending ? "Sending…" : "Request a pilot"}
        </button>
      </div>
    </form>
  );
}
