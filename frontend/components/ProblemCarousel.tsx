"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { Idea } from "@/lib/api/types";
import { Avatar } from "@/components/Avatar";

/** Pull the "Problem" section from a project body; fall back to the whole body. */
function extractProblem(body: string): string {
  const matches = [...body.matchAll(/\*\*\s*(.+?)\s*\*\*/g)];
  let text = "";
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].trim().toLowerCase().startsWith("problem")) {
      const start = (matches[i].index ?? 0) + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
      text = body.slice(start, end).trim();
      break;
    }
  }
  if (!text) text = body.replace(/\*\*/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 220 ? text.slice(0, 220).trimEnd() + "…" : text;
}

/** Position of a card in the deck relative to the active one. */
function deckStyle(pos: number, n: number): CSSProperties {
  if (pos === 0)
    return { transform: "translateX(0) translateY(0) scale(1) rotate(0deg)", opacity: 1, zIndex: 40 };
  if (pos === 1)
    return { transform: "translateY(16px) scale(0.95) rotate(3deg)", opacity: 0.9, zIndex: 30 };
  if (pos === 2)
    return { transform: "translateY(30px) scale(0.9) rotate(-3deg)", opacity: 0.7, zIndex: 20 };
  // The card that just left the front slides off to the side (a "dealt" card).
  if (pos === n - 1)
    return { transform: "translateX(-135%) translateY(-10px) rotate(-12deg) scale(0.95)", opacity: 0, zIndex: 10 };
  return { transform: "translateY(42px) scale(0.85)", opacity: 0, zIndex: 0 };
}

export function ProblemCarousel({
  projects,
  onInteract,
}: {
  projects: Idea[];
  onInteract: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = projects.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % n), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [n, paused]);

  useEffect(() => {
    if (index >= n) setIndex(0);
  }, [n, index]);

  if (n === 0) return null;
  const go = (i: number) => setIndex(((i % n) + n) % n);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Deck */}
      <div className="relative h-[24rem] [perspective:1200px]">
        {projects.map((p, i) => {
          const pos = (i - index + n) % n;
          const front = pos === 0;
          return (
            <div
              key={p.id}
              className="absolute inset-x-0 top-0 mx-auto max-w-xl transition-all duration-500 ease-out"
              style={{ ...deckStyle(pos, n), pointerEvents: front ? "auto" : "none" }}
              aria-hidden={!front}
            >
              <div className="rounded-3xl border border-neutral-200 shadow-md bg-gradient-to-br from-primary-50 via-white to-secondary-500/5 px-6 sm:px-12 py-10 sm:py-12 min-h-[22rem] flex flex-col items-center justify-center text-center">
                <span className="inline-block px-3 py-1 mb-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-wide">
                  {p.category}
                </span>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                  The problem
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-snug">
                  {extractProblem(p.body)}
                </h2>
                <div className="flex items-center gap-2 mt-6">
                  <Avatar src={p.author.avatar_url} name={p.author.full_name ?? p.author.username} size={30} />
                  <span className="text-sm text-neutral-600">
                    <span className="font-semibold text-neutral-800">{p.author.full_name}</span> is building{" "}
                    <span className="font-semibold text-neutral-800">{p.title}</span>
                  </span>
                </div>
                <button
                  onClick={onInteract}
                  className="mt-6 px-7 h-11 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full transition shadow-sm"
                >
                  Request to join →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {n > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => go(index - 1)}
            aria-label="Previous"
            className="w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-primary-600" : "w-2 bg-neutral-300 hover:bg-neutral-400"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => go(index + 1)}
            aria-label="Next"
            className="w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
