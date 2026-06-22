"use client";

import { useAuth } from "@/lib/context/auth";
import Link from "next/link";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <h1 className="font-bold text-lg text-neutral-900">StarFeeds</h1>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden sm:flex gap-6">
            <Link href="/home" className="text-primary-600 font-medium">
              Home
            </Link>
            <Link href="/messages" className="text-neutral-600 hover:text-neutral-900">
              Messages
            </Link>
            <Link href="/notifications" className="text-neutral-600 hover:text-neutral-900">
              Notifications
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.username?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-neutral-900">{user?.full_name}</p>
              <p className="text-xs text-neutral-600">{user?.headline}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
