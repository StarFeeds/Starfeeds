"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { GroupSummary } from "@/lib/api/types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await api.groups.myGroups();
        if (!cancelled) setGroups(g);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <h1 className="text-lg font-bold text-neutral-900 px-1">Your groups</h1>
      <p className="text-sm text-neutral-600 px-1 -mt-2">
        Projects you own or have joined. Open one to chat with the team.
      </p>

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
          You haven&apos;t joined any projects yet. Explore the feed and request to join one.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {groups.map((g) => (
            <Link
              key={g.idea_id}
              href={`/projects/${g.idea_id}/discussion`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-neutral-50 transition"
            >
              <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{g.title}</p>
                <p className="text-xs text-neutral-500">
                  {g.member_count} {g.member_count === 1 ? "member" : "members"}
                  {g.is_owner && " · You own this"}
                </p>
              </div>
              <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
