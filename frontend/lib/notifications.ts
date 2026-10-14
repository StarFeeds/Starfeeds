/** Where tapping a notification should take its reader. Mirrors the
 *  backend's notification_url (push and email links use the same rules). */

import type { Notification } from "@/lib/api/types";

type Linkable = Pick<Notification, "type" | "text" | "idea_id">;

export function notificationHref(n: Linkable): string | null {
  if (n.type === "collab") {
    // Owner: a new request, answered in the Requests tab.
    if (n.text.startsWith("requested to join")) return "/activity?tab=collab";
    // Requester: accepted, so go straight to the team.
    if (n.text.startsWith("accepted your request") && n.idea_id) return `/projects/${n.idea_id}/discussion`;
    // Requester: declined, team closed or removed: back to the project.
    return n.idea_id ? `/i/${n.idea_id}` : null;
  }
  if ((n.type === "comment" || n.type === "upvote") && n.idea_id) return `/i/${n.idea_id}`;
  return null;
}

/** A request the reader (the project owner) still needs to answer. */
export function isJoinRequest(n: Linkable): boolean {
  return n.type === "collab" && n.text.startsWith("requested to join");
}
