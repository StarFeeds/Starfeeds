"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Shown when a logged-out visitor tries to interact with a project. */
export function SignupPrompt({
  open,
  onClose,
  action = "do that",
}: {
  open: boolean;
  onClose: () => void;
  action?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <Logo size={44} />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Join StarFeeds to {action}</h2>
        <p className="text-sm text-neutral-600 mt-1 mb-5">
          Create a free account to join projects, comment, and collaborate with builders.
        </p>
        <div className="space-y-2">
          <Link
            href="/register"
            className="block w-full h-11 leading-[44px] bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full transition"
          >
            Sign up — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="block w-full h-11 leading-[44px] border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-sm font-semibold rounded-full transition"
          >
            Log in
          </Link>
        </div>
        <button
          onClick={onClose}
          className="mt-3 text-xs font-semibold text-neutral-500 hover:text-neutral-700"
        >
          Keep browsing
        </button>
      </div>
    </div>
  );
}
