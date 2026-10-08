/**
 * Idea bodies are plain text with optional "**Heading**\ntext" sections
 * (the backend stores a single body string). These helpers split a body
 * into sections for display, and round-trip it through the composer's
 * description + detail fields for editing.
 */

export type BodySection = { label: string | null; text: string };

/** Optional structured prompts, folded behind "Add more detail" in the composer. */
export const DETAIL_FIELDS = [
  { key: "problem", heading: "Problem", placeholder: "What problem are you solving?" },
  { key: "audience", heading: "Target Audience", placeholder: "Who is it for?" },
  { key: "revenue", heading: "Revenue Model", placeholder: "How could it make money?" },
] as const;

export type DetailKey = (typeof DETAIL_FIELDS)[number]["key"];
export type Details = Record<DetailKey, string>;
export const EMPTY_DETAILS: Details = { problem: "", audience: "", revenue: "" };

/**
 * Split a body written as "**Problem** ... **Solution** ..." into labeled
 * sections. Returns null when there are no ** ** markers (plain body).
 */
export function parseSections(body: string): BodySection[] | null {
  const re = /\*\*\s*(.+?)\s*\*\*/g;
  const sections: BodySection[] = [];
  let match: RegExpExecArray | null;
  let lastEnd = 0;
  let pendingLabel: string | null = null;

  while ((match = re.exec(body)) !== null) {
    const between = body.slice(lastEnd, match.index).trim();
    if (pendingLabel !== null || between) {
      sections.push({ label: pendingLabel, text: between });
    }
    pendingLabel = match[1].trim();
    lastEnd = re.lastIndex;
  }

  if (pendingLabel === null) return null; // no markers at all

  const tail = body.slice(lastEnd).trim();
  sections.push({ label: pendingLabel, text: tail });
  return sections.filter((s) => s.label || s.text);
}

/** Description first, then any filled-in details as headed sections. */
export function composeBody(description: string, details: Details): string {
  return [
    description.trim(),
    ...DETAIL_FIELDS.map(({ key, heading }) =>
      details[key].trim() ? `**${heading}**\n${details[key].trim()}` : null,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Inverse of composeBody for editing. Known detail headings go back into
 * their fields; everything else (including older posts' "Solution" /
 * "Description" sections) stays in the description so nothing is lost.
 */
export function splitBody(body: string): { description: string; details: Details } {
  const sections = parseSections(body);
  if (!sections) return { description: body, details: { ...EMPTY_DETAILS } };

  const details = { ...EMPTY_DETAILS };
  // Plain text first, then other headed sections, so plain text never ends
  // up under a heading when the body is recomposed.
  const plain: string[] = [];
  const headed: string[] = [];
  for (const s of sections) {
    const field = DETAIL_FIELDS.find((f) => f.heading.toLowerCase() === s.label?.toLowerCase());
    if (field && !details[field.key]) {
      details[field.key] = s.text;
    } else if (!s.label || s.label.toLowerCase() === "description") {
      plain.push(s.text);
    } else {
      headed.push(`**${s.label}**\n${s.text}`);
    }
  }
  return { description: [...plain, ...headed].filter(Boolean).join("\n\n"), details };
}

const URL_RE = /\b(https?:\/\/[^\s<>"]+[^\s<>"'.,:;!?)\]])/gi;

/** Split text into plain strings and URLs, for rendering clickable links. */
export function splitLinks(text: string): { text: string; url?: string }[] {
  const parts: { text: string; url?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], url: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Length limits for posts (the API enforces the same ceilings). */
export const LIMITS = { title: 80, description: 400, detail: 200 } as const;

/**
 * Plain-text version of pasted (often AI-written) text: drops markdown
 * headings, bold/italics, bullet symbols and code fences, unwraps links,
 * and collapses big gaps. Line breaks are kept so lists still read.
 */
export function cleanPastedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^```.*$/gm, "")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "") // # Headings
    .replace(/^[ \t]*>[ \t]?/gm, "") // > quotes
    .replace(/^[ \t]*([-*+•▪◦●–]|\d+[.)])[ \t]+/gm, "") // bullets / numbered lists
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, "$1$2") // **bold** / __bold__
    .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,!?:;]|$)/gm, "$1$2") // *italic*
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)") // [text](url)
    .replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, "") // --- rules
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
