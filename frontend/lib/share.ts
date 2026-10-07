/** Shareable links for ideas, and safe post-login redirects. */

import type { Idea } from "@/lib/api/types";

/** Roles authors can recruit for (shown as chips in the composer). */
export const ROLES = ["Co-founder", "Developer", "Designer", "Marketer", "Product manager", "Investor"];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Path of an idea's public page, e.g. "/i/12-alphabag". */
export function ideaPath(idea: Pick<Idea, "id" | "title">): string {
  const slug = slugify(idea.title);
  return `/i/${idea.id}${slug ? `-${slug}` : ""}`;
}

export function ideaUrl(idea: Pick<Idea, "id" | "title">): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.likeminds.live";
  return origin + ideaPath(idea);
}

/** The message people share alongside the link. */
export function shareText(idea: Pick<Idea, "title" | "looking_for">): string {
  const roles = idea.looking_for?.length ? ` Looking for: ${idea.looking_for.join(", ")}.` : "";
  return `I'm building "${idea.title}" on LikeMinds.${roles} Want to join?`;
}

export function shareTargets(idea: Pick<Idea, "id" | "title" | "looking_for">) {
  const url = ideaUrl(idea);
  const text = shareText(idea);
  const enc = encodeURIComponent;
  return {
    url,
    text,
    whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  };
}

/**
 * The `?next=` path to return to after login/sign-up, if it's a safe
 * same-site path; otherwise the default. Read at call time (no Suspense needed).
 */
export function nextPath(fallback = "/home"): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** Append `?next=` to an auth page link. */
export function withNext(path: string, next?: string): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
