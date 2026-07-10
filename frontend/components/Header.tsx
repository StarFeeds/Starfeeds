"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRealtime } from "@/lib/context/realtime";
import { Logo } from "@/components/Logo";
import { SearchBar } from "@/components/SearchBar";

const navItems = [
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
    badgeKey: "messages" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Notifications",
    badgeKey: "notifications" as const,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

export function Header() {
  const pathname = usePathname();
  const { unreadMessages, unreadNotifications } = useRealtime();
  const counts = { messages: unreadMessages, notifications: unreadNotifications };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs">
      <div className="px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2 flex-shrink-0">
          <Logo size={40} />
        </Link>

        {/* Search */}
        <SearchBar />

        {/* Nav */}
        <nav className="flex items-center gap-7 flex-shrink-0">
          {navItems.map((item) => {
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
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-destructive-500 border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold leading-none">
                        {count > 9 ? "9+" : count}
                      </span>
                    </span>
                  )}
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
