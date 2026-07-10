"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { SearchResults } from "@/lib/api/types";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounced live search.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.search(term, 6);
        setResults(r);
      } catch {
        setResults({ ideas: [], users: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goToResults = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") goToResults();
    if (e.key === "Escape") setOpen(false);
  };

  const hasResults = results && (results.ideas.length > 0 || results.users.length > 0);

  return (
    <div ref={boxRef} className="flex-1 max-w-xl relative">
      <div className="relative">
        <svg
          className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ideas and people"
          className="w-full pl-11 pr-4 h-11 bg-neutral-100 border border-neutral-200 rounded-full text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
        />
      </div>

      {open && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {loading && !results ? (
            <div className="px-4 py-6 text-sm text-neutral-500 text-center">Searching…</div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-sm text-neutral-500 text-center">
              No results for “{q.trim()}”
            </div>
          ) : (
            <>
              {results!.users.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wide">People</p>
                  {results!.users.map((u) => (
                    <button
                      key={`u-${u.id}`}
                      onClick={goToResults}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 text-left"
                    >
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{u.full_name[0]}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-neutral-900 truncate">{u.full_name}</span>
                        <span className="block text-xs text-neutral-500 truncate">{u.headline}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results!.ideas.length > 0 && (
                <div className="py-2 border-t border-neutral-100">
                  <p className="px-4 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Ideas</p>
                  {results!.ideas.map((i) => (
                    <button
                      key={`i-${i.id}`}
                      onClick={goToResults}
                      className="w-full flex items-start gap-3 px-4 py-2 hover:bg-neutral-50 text-left"
                    >
                      <span className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-neutral-900 truncate">{i.title}</span>
                        <span className="block text-xs text-primary-600 truncate">{i.category}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={goToResults}
                className="w-full px-4 py-3 border-t border-neutral-100 text-sm font-semibold text-primary-600 hover:bg-neutral-50 text-left"
              >
                See all results for “{q.trim()}” →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
