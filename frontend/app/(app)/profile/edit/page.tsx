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

  // Read an image file, resize to <=256px, and store as a compact JPEG data URL.
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
        setError(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

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
              placeholder="e.g. Innovator"
            />
          </div>

          <div>
            <label className={labelCls}>Profile picture</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 h-11 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {avatarUrl ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="text-sm font-semibold text-destructive-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1.5">
              JPG or PNG. It&apos;s resized automatically before saving.
            </p>
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
