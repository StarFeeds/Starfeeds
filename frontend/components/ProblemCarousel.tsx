"use client";

import { useEffect, useRef, useState } from "react";
import { Idea } from "@/lib/api/types";
import { Avatar } from "@/components/Avatar";

/** Pull the "Problem" section from a project body; fall back to the whole body. */
function extractProblem(body: string): string {
  const matches = [...body.matchAll(/\*\*\s*(.+?)\s*\*\*/g)];
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].trim().toLowerCase().startsWith("problem")) {
      const start = (matches[i].index ?? 0) + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
      return body.slice(start, end).trim();
    }
  }
  return body.replace(/\*\*/g, " ").replace(/\s+/g, " ").trim();
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

  // Auto-advance (unless paused or the user prefers reduced motion).
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
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Viewport */}
      <div className="overflow-hidden rounded-3xl border border-neutral-200 shadow-md bg-white">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {projects.map((p) => (
            <div key={p.id} className="w-full flex-shrink-0">
              <div className="relative px-6 sm:px-14 py-12 sm:py-16 min-h-[22rem] flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary-50 via-white to-secondary-500/5">
                <span className="inline-block px-3 py-1 mb-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-wide">
                  {p.category}
                </span>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                  The problem
                </p>
                <h2 className="max-w-2xl text-2xl sm:text-4xl font-bold text-neutral-900 leading-snug">
                  {extractProblem(p.body)}
                </h2>

                <div className="flex items-center gap-2 mt-7">
                  <Avatar src={p.author.avatar_url} name={p.author.full_name ?? p.author.username} size={32} />
                  <span className="text-sm text-neutral-600">
                    <span className="font-semibold text-neutral-800">{p.author.full_name}</span>{" "}
                    is building <span className="font-semibold text-neutral-800">{p.title}</span>
                  </span>
                </div>

                <button
                  onClick={onInteract}
                  className="mt-6 px-7 h-12 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full transition shadow-sm"
                >
                  Request to join →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      {n > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            aria-label="Previous"
            className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-md flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label="Next"
            className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-neutral-200 shadow-md flex items-center justify-center text-neutral-700 hover:bg-neutral-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {n > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
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
      )}
    </div>
  );
}
