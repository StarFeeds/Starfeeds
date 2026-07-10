"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/context/auth";

const inputCls =
  "w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
const areaCls =
  "w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none";
const labelCls = "block text-sm font-semibold text-neutral-700 mb-1.5";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, refetchUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [headline, setHeadline] = useState(user?.headline ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initial = (fullName || user?.username || "?")[0]?.toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.auth.updateProfile({
        full_name: fullName,
        headline,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      });
      await refetchUser();
      setNotice("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-primary-700">Update Profile</h1>
          <button
            onClick={() => router.push("/profile")}
            className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
          >
            Back to profile
          </button>
        </div>

        {notice && (
          <div className="mb-5 p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
            <p className="text-sm text-success-500">{notice}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg">
            <p className="text-sm text-destructive-500">{error}</p>
          </div>
        )}

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl font-bold">{initial}</span>
            )}
          </div>
          <div>
            <p className="font-bold text-neutral-900">{fullName || "Your name"}</p>
            <p className="text-sm text-neutral-600">{headline || "Add a headline"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              className={inputCls}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className={labelCls}>Headline</label>
            <input
              className={inputCls}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Entrepreneur"
            />
          </div>

          <div>
            <label className={labelCls}>Avatar URL</label>
            <input
              className={inputCls}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className={labelCls}>Bio</label>
            <textarea
              className={areaCls}
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="px-5 h-11 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 h-11 bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white text-sm font-semibold rounded-lg transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
