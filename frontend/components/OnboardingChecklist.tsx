"use client";

import Link from "next/link";

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
  actionLabel: string;
  href?: string;
  onClick?: () => void;
}

export function OnboardingChecklist({
  steps,
  onDismiss,
}: {
  steps: OnboardingStep[];
  onDismiss: () => void;
}) {
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl border border-primary-200 shadow-xs p-5 relative">
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700 p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h2 className="font-bold text-neutral-900">Welcome to IdeaBank 👋</h2>
      <p className="text-sm text-neutral-600 mt-0.5 mb-3">
        {doneCount}/{steps.length} done — finish setting up to get discovered.
      </p>

      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-3 bg-white/70 rounded-xl px-3 py-2.5"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                s.done ? "bg-success-500" : "border-2 border-neutral-300"
              }`}
            >
              {s.done && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span
              className={`flex-1 text-sm font-semibold ${
                s.done ? "text-neutral-400 line-through" : "text-neutral-800"
              }`}
            >
              {s.label}
            </span>
            {!s.done &&
              (s.href ? (
                <Link
                  href={s.href}
                  className="px-3 h-8 flex items-center bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-full transition flex-shrink-0"
                >
                  {s.actionLabel}
                </Link>
              ) : (
                <button
                  onClick={s.onClick}
                  className="px-3 h-8 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-full transition flex-shrink-0"
                >
                  {s.actionLabel}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
