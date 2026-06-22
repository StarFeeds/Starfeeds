"use client";

import { useAuth } from "@/lib/context/auth";
import { api } from "@/lib/api/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="hidden md:block w-80 bg-white border-r border-neutral-200 p-6 sticky top-[72px] h-[calc(100vh-72px)]">
      <div className="space-y-6">
        <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border border-primary-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">{user?.full_name}</h3>
              <p className="text-sm text-neutral-600">{user?.headline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-success-500 rounded-full"></div>
            <span className="text-neutral-700 font-medium">Online</span>
          </div>
          <button className="mt-4 w-full px-3 py-2 border border-primary-600 text-primary-600 text-sm font-semibold rounded-lg hover:bg-primary-50 transition">
            Edit Profile
          </button>
        </div>

        <nav className="space-y-3">
          <Link
            href="/home"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary-50 text-primary-700 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M9 5l3-3m0 0l3 3m-3-3v12" />
            </svg>
            Saved Ideas
          </Link>
          <Link
            href="/activity"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Posts & Activities
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-neutral-700 hover:bg-neutral-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings & Privacy
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="w-full px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-lg transition"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}
