"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { PartnerLead, PartnerReport } from "@/lib/api/types";
import { PartnerReportView } from "@/components/PartnerReportView";

const SITE = "https://www.likeminds.live";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt(`Copy the ${label.toLowerCase()}:`, value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-2">{value}</code>
        <button onClick={copy} className="h-8 px-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex-shrink-0">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPartnersPage() {
  const [ref, setRef] = useState("");
  const [report, setReport] = useState<PartnerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<PartnerLead[] | null>(null);

  useEffect(() => {
    api.admin.partnerLeads().then(setLeads).catch(() => setLeads([]));
  }, []);

  const slug = ref.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await api.admin.partnerReport(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4 space-y-4">
        <div>
          <h2 className="font-bold text-neutral-900">Partner report</h2>
          <p className="text-sm text-neutral-500">
            Each partner gets a tracking name (e.g. <code>semicolon</code>). Their invite link brings members in; the private report
            link shows them what those members did. Sub-campaigns like <code>semicolon-cohort5</code> count toward{" "}
            <code>semicolon</code>.
          </p>
        </div>
        <form onSubmit={load} className="flex gap-2">
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Partner tracking name, e.g. semicolon"
            className="flex-1 h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            disabled={!slug || loading}
            className="h-10 px-5 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {loading ? "Loading…" : "Show report"}
          </button>
        </form>
        {error && <p className="text-sm text-destructive-500">{error}</p>}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CopyField label="Invite link (for their members)" value={`${SITE}/?ref=${report.ref}`} />
            {report.share_url && <CopyField label="Private report link (for the partner)" value={report.share_url} />}
          </div>
        )}
      </div>

      {report && <PartnerReportView report={report} />}

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
        <h2 className="font-bold text-neutral-900 mb-1">Enquiries from /partners</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Also emailed to the admins. Pitch page: <a href="/partners" target="_blank" className="text-primary-700 font-semibold">likeminds.live/partners</a>
        </p>
        {leads === null ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-neutral-500">No enquiries yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {leads.map((l) => (
              <li key={l.id} className="py-3 text-sm">
                <p className="font-semibold text-neutral-900">
                  {l.organisation} <span className="font-normal text-neutral-500">· {l.name}{l.role ? `, ${l.role}` : ""}</span>
                </p>
                <p className="text-neutral-600">
                  <a href={`mailto:${l.email}`} className="text-primary-700">{l.email}</a>
                  {l.phone && ` · ${l.phone}`}
                  {l.community_size && ` · community: ${l.community_size}`}
                  {" · "}
                  {new Date(l.created_at).toLocaleDateString()}
                </p>
                {l.message && <p className="mt-1 text-neutral-700 whitespace-pre-line">{l.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
