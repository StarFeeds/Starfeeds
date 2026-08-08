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
  return text.length > 240 ? text.slice(0, 240).trimEnd() + "…" : text;
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
      {/* Fanned deck */}
      <div className="relative h-[26rem] flex items-start justify-center">
        {projects.map((p, i) => {
          const delta = i - index;
          const abs = Math.abs(delta);
          const front = delta === 0;
          const visible = abs <= 2;
          const style: CSSProperties = {
            transform: `translateX(-50%) translateX(${delta * 46}px) rotate(${delta * 7}deg) scale(${front ? 1 : 0.9})`,
            transformOrigin: "50% 150%",
            opacity: visible ? (front ? 1 : 0.92) : 0,
            zIndex: 50 - abs,
            pointerEvents: visible ? "auto" : "none",
          };
          return (
            <button
              key={p.id}
              onClick={front ? onInteract : () => go(i)}
              aria-hidden={!visible}
              style={style}
              className="absolute left-1/2 top-2 w-64 sm:w-72 h-[21rem] transition-all duration-500 ease-out text-left"
            >
              <div
                className={`w-full h-full rounded-3xl border px-5 py-6 flex flex-col ${
                  front
                    ? "border-primary-200 shadow-md bg-gradient-to-br from-primary-50 via-white to-secondary-500/10"
                    : "border-neutral-200 shadow-sm bg-white"
                }`}
              >
                <span className="inline-block self-start px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold uppercase tracking-wide">
                  {p.category}
                </span>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mt-4 mb-1.5">
                  The problem
                </p>
                <h2 className="text-lg font-bold text-neutral-900 leading-snug line-clamp-5">
                  {extractProblem(p.body)}
                </h2>

                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2">
                    <Avatar src={p.author.avatar_url} name={p.author.full_name ?? p.author.username} size={26} />
                    <span className="text-xs text-neutral-600 truncate">
                      <span className="font-semibold text-neutral-800">{p.author.full_name}</span> · {p.title}
                    </span>
                  </div>
                  {front && (
                    <span className="mt-4 block w-full h-10 leading-10 text-center bg-primary-600 text-white text-sm font-semibold rounded-full">
                      Request to join →
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      {n > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
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
