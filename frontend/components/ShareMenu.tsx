"use client";

import { useState } from "react";
import type { Idea } from "@/lib/api/types";
import { shareTargets } from "@/lib/share";

type ShareIdea = Pick<Idea, "id" | "title" | "looking_for">;

const ICONS = {
  whatsapp: (
    <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 000-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 00-.7.3 2.8 2.8 0 00-.9 2.1 4.9 4.9 0 001 2.6 11.2 11.2 0 004.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 001.7-1.2 2.1 2.1 0 00.1-1.2c0-.1-.2-.2-.4-.3z" />
  ),
  x: <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />,
  linkedin: (
    <path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1a3.8 3.8 0 013.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.3zM5.3 7.4a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zM7.1 20.5H3.5V9h3.6v11.5zM22.2 0H1.8A1.8 1.8 0 000 1.7v20.6A1.8 1.8 0 001.8 24h20.4a1.8 1.8 0 001.8-1.7V1.7A1.8 1.8 0 0022.2 0z" />
  ),
};

/** WhatsApp / X / LinkedIn / copy-link buttons for one idea. */
export function ShareOptions({ idea, onDone }: { idea: ShareIdea; onDone?: () => void }) {
  const t = shareTargets(idea);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.url);
    } catch {
      window.prompt("Copy this link:", t.url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const item =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition";
  const link = (href: string, label: string, icon: React.ReactNode, color: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onDone} className={item}>
      <svg className={`w-5 h-5 ${color}`} fill="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      {label}
    </a>
  );

  return (
    <div className="space-y-0.5">
      {link(t.whatsapp, "WhatsApp", ICONS.whatsapp, "text-[#25D366]")}
      {link(t.x, "X (Twitter)", ICONS.x, "text-neutral-900")}
      {link(t.linkedin, "LinkedIn", ICONS.linkedin, "text-[#0A66C2]")}
      <button onClick={copy} className={item}>
        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
}

/** "Share" button that opens the native share sheet on phones, else a menu. */
export function ShareButton({
  idea,
  className = "",
  labelClassName = "hidden sm:inline",
}: {
  idea: ShareIdea;
  className?: string;
  labelClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  const onClick = async () => {
    const t = shareTargets(idea);
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: idea.title, text: t.text, url: t.url });
        return;
      } catch {
        /* cancelled or unsupported — fall back to the menu */
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative">
      <button onClick={onClick} className={className} aria-haspopup="menu" aria-expanded={open}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className={labelClassName}>Share</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 bottom-full mb-2 z-20 w-52 bg-white border border-neutral-200 rounded-xl shadow-lg p-1.5">
            <ShareOptions idea={idea} onDone={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
