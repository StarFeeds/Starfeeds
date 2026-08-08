"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Idea } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { SignupPrompt } from "@/components/SignupPrompt";

function preview(body: string): string {
  const text = body.replace(/\*\*/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? text.slice(0, 160).trimEnd() + "…" : text;
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<string | null>(null);

  // Logged-in users go straight to the full app.
  useEffect(() => {
    if (!isLoading && user) router.replace("/home");
  }, [isLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.ideas.publicList(1, 18, "recent");
        if (!cancelled) setProjects(resp.items);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || user) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-600">Loading…</div>;
  }

  const gate = (action: string) => () => setPrompt(action);

  return (
    <div className="relative min-h-screen bg-neutral-100 overflow-hidden">
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-24 top-20 w-80 h-80 rounded-full bg-primary-400/30 blur-3xl" />
        <div className="animate-blob absolute right-0 top-1/3 w-80 h-80 rounded-full bg-secondary-500/20 blur-3xl" style={{ animationDelay: "3s" }} />
        <div className="animate-blob absolute left-1/3 bottom-0 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl" style={{ animationDelay: "6s" }} />
      </div>

      <div className="relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-neutral-200">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={36} />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 h-10 leading-10 text-sm font-semibold text-neutral-700 hover:text-neutral-900">
                Log in
              </Link>
              <Link href="/register" className="px-5 h-10 leading-10 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full transition">
                Sign up
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-14 pb-8 text-center">
          <h1 className="animate-fade-up text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            See what people are <span className="text-primary-600">building</span>.
          </h1>
          <p className="animate-fade-up text-lg text-neutral-600 mt-4" style={{ animationDelay: "0.08s" }}>
            Share what you&apos;re working on, request to join projects that excite you,
            and build together in focused groups.
          </p>
          <div className="animate-fade-up flex items-center justify-center gap-3 mt-7" style={{ animationDelay: "0.16s" }}>
            <Link href="/register" className="px-6 h-12 leading-[48px] bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full transition">
              Get started free
            </Link>
            <button onClick={gate("explore")} className="px-6 h-12 border border-neutral-300 bg-white text-neutral-700 font-semibold rounded-full hover:bg-neutral-50 transition">
              Browse projects
            </button>
          </div>
        </section>

        {/* Feed */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4 px-1">
            Fresh from the community
          </h2>
          {loading ? (
            <div className="text-center py-16 text-neutral-600">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200 text-neutral-600">
              No public projects yet — be the first.{" "}
              <Link href="/register" className="text-primary-600 font-semibold">Sign up</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p, i) => (
                <div
                  key={p.id}
                  onClick={gate("join this project")}
                  className="animate-fade-up cursor-pointer bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 flex flex-col hover:shadow-md hover:-translate-y-1 transition duration-200"
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar src={p.author.avatar_url} name={p.author.full_name ?? p.author.username} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{p.author.full_name}</p>
                      <p className="text-xs text-neutral-500 truncate">{p.author.headline}</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-neutral-900 leading-snug">{p.title}</h3>
                  <p className="text-xs font-bold text-secondary-700 uppercase tracking-wide mb-2">{p.category}</p>
                  <p className="text-sm text-neutral-600 leading-relaxed flex-1">{preview(p.body)}</p>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                      </svg>
                      {p.member_count} {p.member_count === 1 ? "member" : "members"}
                    </span>
                    <span>{p.comment_count} comments</span>
                    <span className="ml-auto text-primary-600 font-semibold">Request to Join →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-500">
          © StarFeeds — build together.
        </footer>
      </div>

      <SignupPrompt open={prompt !== null} onClose={() => setPrompt(null)} action={prompt ?? "do that"} />
    </div>
  );
}
