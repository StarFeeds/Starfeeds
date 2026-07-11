"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useRealtime } from "@/lib/context/realtime";
import { useAuth } from "@/lib/context/auth";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";

type BadgeKey = "messages" | "notifications";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: BadgeKey;
}

// Shown in the header on desktop, and in the mobile menu.
const primaryNav: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9" />
      </svg>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    badgeKey: "messages",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Notifications",
    badgeKey: "notifications",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    ),
  },
];

// Extra destinations shown only in the mobile menu (they live in the desktop sidebar).
const menuOnlyNav: NavItem[] = [
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Saved Ideas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
  {
    href: "/activity",
    label: "Posts & Activities",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings & Privacy",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-destructive-500 border-2 border-white rounded-full flex items-center justify-center">
      <span className="text-white text-[10px] font-bold leading-none">{count > 9 ? "9+" : count}</span>
    </span>
  );
}

const adminNav: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadMessages, unreadNotifications } = useRealtime();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const counts: Record<BadgeKey, number> = {
    messages: unreadMessages,
    notifications: unreadNotifications,
  };
  const menuItems = user?.is_admin ? [...menuOnlyNav, adminNav] : menuOnlyNav;
  const desktopNav = user?.is_admin ? [...primaryNav, adminNav] : primaryNav;

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push("/login");
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs">
      <div className="px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2 flex-shrink-0">
          <Logo size={40} />
        </Link>

        {/* Search */}
        <SearchBar />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 flex-shrink-0">
          {desktopNav.map((item) => {
            const active = pathname === item.href;
            const count = item.badgeKey ? counts[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 text-sm font-semibold transition ${
                  active ? "text-primary-600" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <span className="relative">
                  {item.icon}
                  <Badge count={count} />
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden relative flex-shrink-0 p-2 -mr-2 text-neutral-700"
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          {!menuOpen && <Badge count={unreadMessages + unreadNotifications} />}
        </button>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 bg-black/20 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="md:hidden absolute left-0 right-0 top-16 bg-white border-b border-neutral-200 shadow-lg z-50 p-2">
            {[...primaryNav, ...menuItems].map((item) => {
              const active = pathname === item.href;
              const count = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    active ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <span className="relative">
                    {item.icon}
                    <Badge count={count} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 mt-1 rounded-xl text-sm font-semibold text-destructive-500 hover:bg-destructive-500/5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </nav>
        </>
      )}
    </header>
  );
}
