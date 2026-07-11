"use client";

import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

/**
 * Shared authenticated-app shell: decorative background, sticky header and a
 * centered two-column container (sidebar + main). Pass `sidebar` to override
 * the default nav Sidebar (e.g. the profile info column).
 */
export function AppShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-neutral-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-40 w-72 h-72 rounded-full bg-primary-400/30 blur-3xl" />
        <div className="absolute left-1/4 bottom-10 w-80 h-80 rounded-full bg-secondary-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 w-72 h-72 rounded-full bg-primary-500/20 blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-4 md:gap-6 md:items-start">
          {sidebar ?? <Sidebar />}
          <main className="flex-1 min-w-0 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
