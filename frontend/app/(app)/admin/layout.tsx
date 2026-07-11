"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/context/auth";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ideas", label: "Ideas" },
  { href: "/admin/announcements", label: "Announcements" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user?.is_admin) {
      router.replace("/home");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-600">Loading…</div>
    );
  }
  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-600">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 mb-1">Admin</h1>
          <p className="text-sm text-neutral-600">Manage users, moderate content, and broadcast updates.</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-2 overflow-x-auto">
          <nav className="flex items-center gap-1 min-w-max">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                    active ? "bg-primary-50 text-primary-700 border border-primary-200" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}
