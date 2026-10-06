"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { LinkCheck } from "@/lib/api/types";
import { hostOf } from "@/lib/ideaBody";

interface LinkViewerProps {
  url: string;
  onClose: () => void;
}

/**
 * Opens a project link inside LikeMinds so people can come straight back to
 * their feed. Sites that refuse to be framed (X-Frame-Options / CSP, checked
 * by the backend) get a card with an "Open in new tab" button instead.
 *
 * The browser Back button also closes the viewer: we push a history entry
 * on open (copying Next's router state so it treats it as the same page)
 * and close on popstate.
 */
export function LinkViewer({ url, onClose }: LinkViewerProps) {
  const [check, setCheck] = useState<LinkCheck | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    api.links
      .check(url)
      .then((r) => !cancelled && setCheck(r))
      .catch(() => !cancelled && setCheck({ url, embeddable: false, reachable: false }));
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    window.history.pushState({ ...window.history.state, lmLinkViewer: true }, "");
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  /** Close via history so the entry we pushed doesn't linger. */
  function close() {
    if (window.history.state?.lmLinkViewer) window.history.back();
    else onCloseRef.current();
  }

  const host = hostOf(url);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-label={`Viewing ${host}`}>
      <div className="flex items-center gap-3 h-14 px-3 sm:px-4 border-b border-neutral-200 bg-white flex-shrink-0">
        <button
          onClick={close}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Back to LikeMinds</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 h-9 px-3 rounded-full bg-neutral-100 text-sm text-neutral-600">
          {url.startsWith("https://") && (
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
          <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold text-primary-700 hover:bg-primary-50 transition flex-shrink-0"
          aria-label="Open in new tab"
        >
          <span className="hidden sm:inline">Open in new tab</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="flex-1 min-h-0 bg-neutral-100">
        {check === null ? (
          <div className="h-full flex items-center justify-center text-sm text-neutral-500">
            Loading {host}…
          </div>
        ) : check.embeddable ? (
          <iframe
            src={url}
            title={host}
            className="w-full h-full bg-white border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="font-bold text-neutral-900">{host}</h3>
              <p className="mt-1 text-sm text-neutral-600">
                {check.reachable
                  ? "This site doesn't allow being shown inside LikeMinds."
                  : "We couldn't reach this site right now."}{" "}
                Open it in a new tab. LikeMinds stays open here, so you can come straight back.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-11 rounded-full bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-semibold transition"
                >
                  Open in new tab
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  onClick={close}
                  className="h-11 rounded-full text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Back to LikeMinds
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
