"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { enablePush, getPushState, needsHomeScreen, pushSupported, type PushState } from "@/lib/push";

const DISMISS_KEY = "lm_push_prompt_dismissed";

/**
 * Small feed card offering browser notifications. Never triggers the
 * browser's permission prompt on its own; only when the user taps "Turn on".
 * Also re-links an existing subscription to whoever is logged in now.
 */
export function PushPrompt() {
  const [state, setState] = useState<PushState | null>(null);
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) return !cancelled && setState("unsupported");
      const [s, key] = await Promise.all([getPushState(), api.push.publicKey().catch(() => null)]);
      if (cancelled) return;
      setAvailable(!!key);
      setState(s);
      if (s === "on" && key) {
        // Same browser, possibly a different account than last time.
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) api.push.subscribe(sub.toJSON()).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: just hide it for now */
    }
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      setState(await enablePush());
    } catch (err) {
      console.error("Couldn't turn on push notifications", err);
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const iosNeedsInstall = state === "unsupported" && needsHomeScreen();
  if (dismissed || !(available || iosNeedsInstall) || (state !== "off" && !iosNeedsInstall)) return null;

  return (
    <div className="bg-white rounded-2xl border border-primary-200 shadow-xs p-4 flex items-start gap-3">
      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary-50 flex items-center justify-center">
        <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900">Don&apos;t miss replies and join requests</p>
        <p className="text-sm text-neutral-600">
          {iosNeedsInstall
            ? "On iPhone, tap Share → Add to Home Screen, then open LikeMinds from there to turn on notifications."
            : "Get a notification when someone replies, asks to join your project, or messages your team."}
        </p>
        {!iosNeedsInstall && (
          <button
            onClick={turnOn}
            disabled={busy}
            className="mt-3 px-4 h-9 rounded-full bg-primary-700 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold transition"
          >
            {busy ? "Turning on…" : "Turn on notifications"}
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-neutral-400 hover:text-neutral-700" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
