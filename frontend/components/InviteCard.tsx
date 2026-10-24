"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/context/auth";
import { inviteUrl } from "@/lib/referral";

/** "Invite builders": the member's personal link, and how many joined from it. */
export function InviteCard() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.auth
      .invites()
      .then((r) => !cancelled && setCount(r.count))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  const url = inviteUrl(user.username);
  const text = "I'm on LikeMinds, where builders find co-founders and teammates. Join me:";

  const share = async () => {
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "LikeMinds", text, url });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy your invite link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-4">
      <h3 className="font-bold text-sm text-neutral-900">Invite builders</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Know someone who should be building with you? Send them your link.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={share}
          className="flex-1 h-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition"
        >
          {copied ? "Link copied!" : "Copy invite link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-3 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold flex items-center"
          aria-label="Invite on WhatsApp"
        >
          WhatsApp
        </a>
      </div>
      {count !== null && count > 0 && (
        <p className="mt-2 text-xs font-semibold text-primary-700">
          {count === 1 ? "1 person has" : `${count} people have`} joined from your links
        </p>
      )}
    </div>
  );
}
