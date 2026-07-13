"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { AdminUser } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async (query: string) => {
    setLoading(true);
    try {
      const r = await api.admin.listUsers(query, 1, 50);
      setUsers(r.items);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const patch = async (u: AdminUser, data: { is_admin?: boolean; is_active?: boolean }) => {
    setBusy(u.id);
    try {
      const updated = await api.admin.updateUser(u.id, data);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.full_name} (${u.email})? This removes all their content and cannot be undone.`)) return;
    setBusy(u.id);
    try {
      await api.admin.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, username or email"
        className="w-full px-4 h-11 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <p className="text-xs text-neutral-500 px-1">{total} user{total === 1 ? "" : "s"}</p>

      {loading ? (
        <div className="text-center py-12 text-neutral-600">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs divide-y divide-neutral-100">
          {users.map((u) => (
            <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-900 truncate">{u.full_name}</span>
                  {u.is_admin && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-100 text-primary-700">ADMIN</span>}
                  {!u.is_active && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-destructive-500/10 text-destructive-500">SUSPENDED</span>}
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  @{u.username} · {u.email} · {u.idea_count} idea{u.idea_count === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Joined {fmtDate(u.created_at)}
                  </span>
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {u.signup_location || u.signup_ip || "Unknown"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <button
                  onClick={() => patch(u, { is_active: !u.is_active })}
                  disabled={busy === u.id || u.id === me?.id}
                  className="px-3 h-8 rounded-full text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition"
                >
                  {u.is_active ? "Suspend" : "Unsuspend"}
                </button>
                <button
                  onClick={() => patch(u, { is_admin: !u.is_admin })}
                  disabled={busy === u.id || u.id === me?.id}
                  className="px-3 h-8 rounded-full text-xs font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 transition"
                >
                  {u.is_admin ? "Revoke admin" : "Make admin"}
                </button>
                <button
                  onClick={() => remove(u)}
                  disabled={busy === u.id || u.id === me?.id}
                  className="px-3 h-8 rounded-full text-xs font-semibold border border-destructive-500 text-destructive-500 hover:bg-destructive-500/5 disabled:opacity-40 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center py-8 text-sm text-neutral-500">No users found.</p>}
        </div>
      )}
    </div>
  );
}
