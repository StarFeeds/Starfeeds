"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { Idea } from "@/lib/api/types";
import { IdeaCard } from "@/components/IdeaCard";

/** "Idea of the day" pinned at the top of the feed (changes daily). */
export function FeaturedIdea() {
  const [idea, setIdea] = useState<Idea | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.ideas
      .featured(true)
      .then((i) => !cancelled && setIdea(i))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!idea) return null;
  return (
    <section aria-label="Idea of the day" className="space-y-2">
      <p className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-primary-700">
        <span aria-hidden>💡</span> Idea of the day
      </p>
      <div className="rounded-2xl ring-2 ring-primary-200">
        <IdeaCard
          idea={idea}
          onUpvote={async (id) => setIdea(await api.ideas.upvote(id))}
          onSave={async (id) => setIdea(await api.ideas.save(id))}
          onDelete={() => setIdea(null)}
        />
      </div>
    </section>
  );
}
