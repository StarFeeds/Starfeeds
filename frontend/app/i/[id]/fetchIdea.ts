import type { Idea } from "@/lib/api/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Server-side fetch of a public idea for its share page / preview image.
 *  `param` is the URL segment, e.g. "12-alphabag". Null if missing or not public. */
export async function fetchPublicIdea(param: string): Promise<Idea | null> {
  const id = parseInt(param, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/ideas/${id}`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as Idea) : null;
  } catch {
    return null;
  }
}

/** Plain-text summary of a body (drops **Heading** markers). */
export function summarize(body: string, max = 160): string {
  const text = body.replace(/\*\*\s*(.+?)\s*\*\*/g, "$1:").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}
