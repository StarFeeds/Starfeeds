"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { Idea } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";
import { IdeaCard } from "@/components/IdeaCard";
import { Logo } from "@/components/Logo";
import { SignupPrompt } from "@/components/SignupPrompt";
import { ideaPath, withNext } from "@/lib/share";

/**
 * Client side of the shareable idea page. Renders the server-fetched idea
 * immediately (so visitors and link crawlers see content), then refetches
 * with the viewer's login for their upvote/save/join state, or to load a
 * members-only idea.
 */
export function PublicIdea({ ideaId, initial }: { ideaId: number; initial: Idea | null }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(initial);
  const [missing, setMissing] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const path = idea ? ideaPath(idea) : `/i/${ideaId}`;

  useEffect(() => {
    if (isLoading || !user || !Number.isFinite(ideaId)) return;
    let cancelled = false;
    api.ideas
      .get(ideaId, true)
      .then((i) => !cancelled && setIdea(i))
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [isLoading, user, ideaId]);

  const notFound = (!idea && !isLoading && !user) || (!idea && missing);

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="LikeMinds home">
            <Logo size={34} />
          </Link>
          {user ? (
            <Link href="/home" className="text-sm font-semibold text-primary-700 hover:text-primary-600">
              Go to your feed →
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={withNext("/login", path)} className="px-4 h-9 inline-flex items-center text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-full">
                Log in
              </Link>
              <Link href={withNext("/register", path)} className="px-4 h-9 inline-flex items-center text-sm font-semibold text-white bg-primary-700 hover:bg-primary-600 rounded-full">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {idea ? (
          <IdeaCard
            idea={idea}
            onUpvote={async (id) => setIdea(await api.ideas.upvote(id))}
            onSave={async (id) => setIdea(await api.ideas.save(id))}
            onDelete={() => router.push("/home")}
            onGuestAction={user ? undefined : setPrompt}
          />
        ) : notFound ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
            <h1 className="text-lg font-bold text-neutral-900">This project isn&apos;t available</h1>
            <p className="mt-1 text-sm text-neutral-600">
              It may have been removed, or it&apos;s only visible to LikeMinds members.
            </p>
            <Link href={user ? "/home" : withNext("/login", path)} className="mt-4 inline-block text-sm font-semibold text-primary-700">
              {user ? "Back to your feed" : "Log in to see it"}
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm text-neutral-500 py-12">Loading…</p>
        )}

        {!user && !isLoading && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center">
            <h2 className="font-bold text-neutral-900">Want to help build this?</h2>
            <p className="mt-1 text-sm text-neutral-600">
              LikeMinds is where people share what they&apos;re building and find collaborators. It&apos;s free.
            </p>
            <Link
              href={withNext("/register", path)}
              className="mt-4 inline-flex items-center justify-center px-6 h-11 rounded-full bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-semibold transition"
            >
              Join LikeMinds
            </Link>
          </div>
        )}
      </main>

      <SignupPrompt open={prompt !== null} onClose={() => setPrompt(null)} action={prompt ?? "do that"} next={path} />
    </div>
  );
}
