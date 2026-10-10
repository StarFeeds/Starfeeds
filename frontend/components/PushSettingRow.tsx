"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, getPushState, needsHomeScreen, type PushState } from "@/lib/push";

/** Settings: browser notifications on this device (separate from email). */
export function PushSettingRow() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } finally {
      setBusy(false);
    }
  };

  const note =
    state === "blocked"
      ? "Blocked in your browser settings. Allow notifications for likeminds.live to turn this on."
      : state === "unavailable"
        ? "Not available yet."
        : state === "unsupported"
          ? needsHomeScreen()
            ? "On iPhone, add LikeMinds to your Home Screen first (Share → Add to Home Screen)."
            : "This browser doesn't support notifications."
          : "Replies, join requests and team messages, when you're not on LikeMinds.";

  const on = state === "on";
  const disabled = busy || state === null || state === "blocked" || state === "unsupported" || state === "unavailable";
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-neutral-700">
        Push notifications on this device
        <span className="block text-xs text-neutral-500">{note}</span>
      </span>
      <button
        role="switch"
        aria-checked={on}
        aria-label="Push notifications on this device"
        onClick={toggle}
        disabled={disabled}
        className={`relative w-11 h-6 flex-shrink-0 rounded-full transition ${on ? "bg-primary-600" : "bg-neutral-300"} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
