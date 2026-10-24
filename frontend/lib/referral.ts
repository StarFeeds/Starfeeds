/** Where visitors came from: the `?ref=` on the link they arrived by.
 *
 * A ref is a campaign name (`?ref=unilag`) or a member's username (their
 * invite link, and every idea they share). The first one seen is kept for
 * 30 days and sent with sign-up, so the admin funnel can show which
 * communities and members bring people who go on to form teams.
 */

const KEY = "lm_ref";
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

/** Remember the `?ref=` in the current URL, unless an earlier one is still fresh. */
export function captureRef(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (!ref) return;
    const saved = JSON.parse(localStorage.getItem(KEY) || "null") as { ref: string; at: number } | null;
    if (saved && Date.now() - saved.at < KEEP_MS) return;
    localStorage.setItem(KEY, JSON.stringify({ ref: ref.slice(0, 60), at: Date.now() }));
  } catch {
    // storage blocked: attribution is best-effort
  }
}

/** The remembered ref, if still fresh. */
export function getRef(): string | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null") as { ref: string; at: number } | null;
    return saved && Date.now() - saved.at < KEEP_MS ? saved.ref : undefined;
  } catch {
    return undefined;
  }
}

/** Add `?ref=` to a link (no-op without a ref). */
export function withRef(url: string, ref?: string | null): string {
  if (!ref) return url;
  return `${url}${url.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`;
}

/** A member's personal invite link. */
export function inviteUrl(username: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.likeminds.live";
  return withRef(origin + "/", username);
}
