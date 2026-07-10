"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/context/auth";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition flex-shrink-0 ${
        on ? "bg-primary-600" : "bg-neutral-300"
      }`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-neutral-700">{label}</span>
      <Toggle on={value} onChange={onChange} />
    </div>
  );
}

const inputCls =
  "w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
const labelCls = "block text-sm font-semibold text-neutral-700 mb-1.5";
const headingCls = "text-lg font-bold text-primary-700 mb-5";

export default function SettingsPage() {
  const { user, refetchUser, logout } = useAuth();
  const router = useRouter();
  const np = user?.notification_prefs ?? {};
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [prefs, setPrefs] = useState({
    comments: np.comments ?? true,
    collab: np.collab ?? true,
    mentions: np.mentions ?? false,
    announcements: np.announcements ?? true,
    weekly: np.weekly ?? true,
    important: np.important ?? true,
  });
  const [visibility, setVisibility] = useState({
    publicProfile: np.public_profile ?? true,
    showOnline: np.show_online ?? true,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setError(null);
    try {
      await api.auth.updateProfile({ email, phone: phone || null });
      await api.auth.updateNotificationPrefs({
        ...prefs,
        public_profile: visibility.publicProfile,
        show_online: visibility.showOnline,
      });
      await refetchUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    try {
      await api.auth.deleteAccount();
      logout();
      router.push("/register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  };

  return (
    <AppShell>
      {/* Account */}
      <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className={`${headingCls} mb-0`}>Account</h2>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 h-10 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-semibold rounded-lg transition"
          >
            {saved ? "Saved!" : "Save Changes"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg">
            <p className="text-sm text-destructive-500">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Phone number</label>
            <div className="flex gap-2">
              <select className={`${inputCls} w-24`} defaultValue="NIG">
                <option>NIG</option>
                <option>USA</option>
                <option>UK</option>
              </select>
              <input
                className={inputCls}
                placeholder="09034562190"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <h3 className="font-bold text-neutral-900 mb-3">Connected Accounts</h3>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-700">{email || "Not connected"}</span>
            <button className="text-sm font-semibold text-destructive-500 hover:underline">Disconnect</button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">No connected account</span>
            <button className="text-sm font-semibold text-neutral-900 hover:underline">Connect</button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-neutral-200 pt-5">
          <div>
            <h3 className="font-bold text-neutral-900 mb-1">Delete your account?</h3>
            <p className="text-sm text-neutral-600 max-w-md">
              Deleting your account means you will lose all information associated with this account and it is
              irreversible.
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="px-4 h-10 bg-destructive-500 hover:opacity-90 text-white text-sm font-semibold rounded-lg transition flex-shrink-0"
          >
            Delete
          </button>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6">
        <h2 className={headingCls}>Notification Preferences</h2>
        <div className="divide-y divide-neutral-100">
          <ToggleRow label="Comments on posts" value={prefs.comments} onChange={() => toggle("comments")} />
          <ToggleRow label="Collaboration Requests" value={prefs.collab} onChange={() => toggle("collab")} />
          <ToggleRow label="Mentions in discussions" value={prefs.mentions} onChange={() => toggle("mentions")} />
          <ToggleRow label="General Announcements" value={prefs.announcements} onChange={() => toggle("announcements")} />
        </div>

        <h3 className="font-bold text-neutral-900 mt-5 mb-1">Email Preferences</h3>
        <div className="divide-y divide-neutral-100">
          <ToggleRow label="Weekly Digests" value={prefs.weekly} onChange={() => toggle("weekly")} />
          <ToggleRow label="Important Updates" value={prefs.important} onChange={() => toggle("important")} />
        </div>
      </section>

      {/* Profile & Visibility */}
      <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6">
        <h2 className={headingCls}>Profile &amp; Visibility</h2>
        <div className="divide-y divide-neutral-100">
          <ToggleRow
            label="Public profile"
            value={visibility.publicProfile}
            onChange={() => setVisibility((v) => ({ ...v, publicProfile: !v.publicProfile }))}
          />
          <ToggleRow
            label="Show when I'm online"
            value={visibility.showOnline}
            onChange={() => setVisibility((v) => ({ ...v, showOnline: !v.showOnline }))}
          />
        </div>
      </section>
    </AppShell>
  );
}
