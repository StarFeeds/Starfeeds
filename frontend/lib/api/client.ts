import {
  TokenPair,
  User,
  Idea,
  IdeaInput,
  IdeaListResponse,
  LinkCheck,
  TeamFunnel,
  UnsubscribeScope,
  Comment,
  Notification,
  CollaborationRequest,
  Conversation,
  Message,
  UserUpdate,
  NotificationPrefs,
  SearchResults,
  AdminStats,
  AdminUser,
  AdminUserList,
  AdminIdea,
  AdminIdeaList,
  PublicUser,
  GroupMessage,
  GroupSummary,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Current access token, or null. Used by the realtime WebSocket layer. */
export function getAccessToken(): string | null {
  return getStoredTokens()?.access ?? null;
}

/** WebSocket URL for the live channel (http(s) -> ws(s)). */
export function getRealtimeUrl(token: string): string {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/api/v1/ws?token=${encodeURIComponent(token)}`;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

let storedTokens: AuthTokens | null = null;

function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  if (storedTokens) return storedTokens;
  try {
    const stored = localStorage.getItem("auth_tokens");
    if (stored) {
      storedTokens = JSON.parse(stored);
      return storedTokens;
    }
  } catch {
    localStorage.removeItem("auth_tokens");
  }
  return null;
}

function setStoredTokens(tokens: AuthTokens | null) {
  storedTokens = tokens;
  if (typeof window !== "undefined") {
    if (tokens) {
      localStorage.setItem("auth_tokens", JSON.stringify(tokens));
    } else {
      localStorage.removeItem("auth_tokens");
    }
  }
}

// Dedupe concurrent refreshes: many requests may 401 at once, but we only
// want a single /auth/refresh in flight.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const tokens = getStoredTokens();
  if (!tokens?.refresh) return false;

  refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh }),
      });
      if (!resp.ok) return false;
      const data = (await resp.json()) as TokenPair;
      setStoredTokens({ access: data.access_token, refresh: data.refresh_token });
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function apiCall<T>(
  path: string,
  options: RequestInit & { requiresAuth?: boolean; _retried?: boolean } = {}
): Promise<T> {
  const { requiresAuth = false, _retried = false, ...fetchOptions } = options;
  const url = `${API_URL}/api/v1${path}`;
  const headers = new Headers(fetchOptions.headers || {});

  if (requiresAuth) {
    const tokens = getStoredTokens();
    if (!tokens?.access) {
      throw new Error("Not authenticated");
    }
    headers.set("Authorization", `Bearer ${tokens.access}`);
  }

  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(url, { ...fetchOptions, headers });

  if (!resp.ok) {
    if (resp.status === 401 && requiresAuth) {
      // Access token likely expired — refresh once and retry the request.
      if (!_retried && (await tryRefresh())) {
        return apiCall<T>(path, { ...options, _retried: true });
      }
      setStoredTokens(null);
      throw new Error("Session expired. Please log in again.");
    }
    const error = await resp.text();
    let message = error || `API error: ${resp.status}`;
    try {
      const parsed = JSON.parse(error);
      if (Array.isArray(parsed?.detail)) {
        // FastAPI validation errors: [{ loc, msg, ... }]
        message = parsed.detail
          .map((e: { msg?: string }) => e?.msg ?? "")
          .filter(Boolean)
          .join(", ");
      } else if (parsed?.detail) {
        message = parsed.detail;
      }
    } catch {
      // not JSON; keep raw text
    }
    throw new Error(message);
  }

  if (resp.status === 204 || resp.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return resp.json();
}

export const api = {
  auth: {
    register: async (email: string, username: string, fullName: string, password: string, phone?: string): Promise<TokenPair> => {
      const tokens = await apiCall<TokenPair>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, full_name: fullName, password, phone: phone || null }),
      });
      setStoredTokens({ access: tokens.access_token, refresh: tokens.refresh_token });
      return tokens;
    },

    login: async (email: string, password: string): Promise<TokenPair> => {
      const tokens = await apiCall<TokenPair>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setStoredTokens({ access: tokens.access_token, refresh: tokens.refresh_token });
      return tokens;
    },

    /** Sign in / sign up with a Google Identity Services credential. */
    google: async (credential: string): Promise<TokenPair & { is_new: boolean }> => {
      const tokens = await apiCall<TokenPair & { is_new: boolean }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      setStoredTokens({ access: tokens.access_token, refresh: tokens.refresh_token });
      return tokens;
    },

    refresh: async (refreshToken: string): Promise<TokenPair> => {
      const tokens = await apiCall<TokenPair>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      setStoredTokens({ access: tokens.access_token, refresh: tokens.refresh_token });
      return tokens;
    },

    me: async (): Promise<User> => {
      return apiCall<User>("/auth/me", { requiresAuth: true });
    },

    updateProfile: async (data: UserUpdate): Promise<User> => {
      return apiCall<User>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(data),
        requiresAuth: true,
      });
    },

    updateNotificationPrefs: async (
      prefs: Partial<NotificationPrefs>
    ): Promise<User> => {
      return apiCall<User>("/auth/me/notification-prefs", {
        method: "PATCH",
        body: JSON.stringify(prefs),
        requiresAuth: true,
      });
    },

    deleteAccount: async (): Promise<void> => {
      await apiCall<void>("/auth/me", { method: "DELETE", requiresAuth: true });
      setStoredTokens(null);
    },

    logout: () => {
      setStoredTokens(null);
    },
  },

  ideas: {
    list: async (
      page = 1,
      pageSize = 10,
      category?: string,
      sort: "recent" | "top" = "recent",
      opts?: { saved?: boolean; authorId?: number }
    ): Promise<IdeaListResponse> => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort });
      if (category) params.append("category", category);
      if (opts?.saved) params.append("saved", "true");
      if (opts?.authorId != null) params.append("author_id", String(opts.authorId));
      return apiCall<IdeaListResponse>(`/ideas?${params}`, { requiresAuth: true });
    },

    // Public feed for logged-out visitors (no auth). Only returns public projects.
    publicList: async (page = 1, pageSize = 12, sort: "recent" | "top" = "recent"): Promise<IdeaListResponse> => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort });
      return apiCall<IdeaListResponse>(`/ideas?${params}`);
    },

    /** One idea (its shareable page). Pass auth=true when logged in for per-viewer state. */
    get: async (ideaId: number, auth = false): Promise<Idea> => {
      return apiCall<Idea>(`/ideas/${ideaId}`, { requiresAuth: auth });
    },

    listComments: async (ideaId: number): Promise<Comment[]> => {
      return apiCall<Comment[]>(`/ideas/${ideaId}/comments`, { requiresAuth: true });
    },

    /** Comment on an idea, or reply to a comment (parentId). */
    addComment: async (ideaId: number, body: string, parentId?: number): Promise<Comment> => {
      return apiCall<Comment>(`/ideas/${ideaId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, parent_id: parentId ?? null }),
        requiresAuth: true,
      });
    },

    expressInterest: async (ideaId: number, message?: string): Promise<CollaborationRequest> => {
      return apiCall<CollaborationRequest>(`/ideas/${ideaId}/interest`, {
        method: "POST",
        body: JSON.stringify({ message: message?.trim() || null }),
        requiresAuth: true,
      });
    },

    create: async (input: IdeaInput): Promise<Idea> => {
      return apiCall<Idea>("/ideas", {
        method: "POST",
        body: JSON.stringify(input),
        requiresAuth: true,
      });
    },

    /** Author-only partial update. Pass project_url: "" to remove the link. */
    update: async (ideaId: number, patch: Partial<IdeaInput>): Promise<Idea> => {
      return apiCall<Idea>(`/ideas/${ideaId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
        requiresAuth: true,
      });
    },

    upvote: async (ideaId: number): Promise<Idea> => {
      return apiCall<Idea>(`/ideas/${ideaId}/upvote`, {
        method: "POST",
        requiresAuth: true,
      });
    },

    save: async (ideaId: number): Promise<Idea> => {
      return apiCall<Idea>(`/ideas/${ideaId}/save`, {
        method: "POST",
        requiresAuth: true,
      });
    },

    remove: async (ideaId: number): Promise<void> => {
      await apiCall<void>(`/ideas/${ideaId}`, { method: "DELETE", requiresAuth: true });
    },
  },

  email: {
    /** One-click unsubscribe from activity emails (token from the email link; no login). */
    unsubscribe: async (token: string): Promise<{ email: string; scope: UnsubscribeScope }> => {
      return apiCall<{ email: string; scope: UnsubscribeScope }>("/email/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    },
  },

  links: {
    /** Whether a link can be shown inside LikeMinds (iframe) or must open in a new tab. */
    check: async (url: string): Promise<LinkCheck> => {
      return apiCall<LinkCheck>(`/links/check?url=${encodeURIComponent(url)}`, {
        requiresAuth: true,
      });
    },
  },

  notifications: {
    list: async (): Promise<Notification[]> => {
      return apiCall<Notification[]>("/notifications", { requiresAuth: true });
    },
    unreadCount: async (): Promise<number> => {
      const r = await apiCall<{ count: number }>("/notifications/unread-count", {
        requiresAuth: true,
      });
      return r.count;
    },
    markRead: async (id: number): Promise<Notification> => {
      return apiCall<Notification>(`/notifications/${id}/read`, {
        method: "POST",
        requiresAuth: true,
      });
    },
    markAllRead: async (): Promise<void> => {
      await apiCall<void>("/notifications/read-all", {
        method: "POST",
        requiresAuth: true,
      });
    },
  },

  activity: {
    list: async (
      type: "all" | "ratings" | "comments" | "collab" = "all"
    ): Promise<Notification[]> => {
      return apiCall<Notification[]>(`/activity?type=${type}`, { requiresAuth: true });
    },
  },

  collaboration: {
    list: async (box: "incoming" | "outgoing" = "incoming"): Promise<CollaborationRequest[]> => {
      return apiCall<CollaborationRequest[]>(`/collaboration-requests?box=${box}`, {
        requiresAuth: true,
      });
    },
    accept: async (id: number): Promise<CollaborationRequest> => {
      return apiCall<CollaborationRequest>(`/collaboration-requests/${id}/accept`, {
        method: "POST",
        requiresAuth: true,
      });
    },
    decline: async (id: number): Promise<CollaborationRequest> => {
      return apiCall<CollaborationRequest>(`/collaboration-requests/${id}/decline`, {
        method: "POST",
        requiresAuth: true,
      });
    },
  },

  messages: {
    listConversations: async (): Promise<Conversation[]> => {
      return apiCall<Conversation[]>("/conversations", { requiresAuth: true });
    },
    createConversation: async (userId: number): Promise<Conversation> => {
      return apiCall<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
        requiresAuth: true,
      });
    },
    listMessages: async (conversationId: number): Promise<Message[]> => {
      return apiCall<Message[]>(`/conversations/${conversationId}/messages`, {
        requiresAuth: true,
      });
    },
    send: async (conversationId: number, body: string): Promise<Message> => {
      return apiCall<Message>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
        requiresAuth: true,
      });
    },
  },

  search: async (q: string, limit = 8): Promise<SearchResults> => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return apiCall<SearchResults>(`/search?${params}`, { requiresAuth: true });
  },

  users: {
    get: async (username: string): Promise<PublicUser> =>
      apiCall<PublicUser>(`/users/${encodeURIComponent(username)}`, { requiresAuth: true }),
  },

  groups: {
    myGroups: async (): Promise<GroupSummary[]> =>
      apiCall<GroupSummary[]>("/me/groups", { requiresAuth: true }),
    members: async (ideaId: number): Promise<PublicUser[]> =>
      apiCall<PublicUser[]>(`/ideas/${ideaId}/members`, { requiresAuth: true }),
    listMessages: async (ideaId: number): Promise<GroupMessage[]> =>
      apiCall<GroupMessage[]>(`/ideas/${ideaId}/group/messages`, { requiresAuth: true }),
    sendMessage: async (ideaId: number, body: string): Promise<GroupMessage> =>
      apiCall<GroupMessage>(`/ideas/${ideaId}/group/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
        requiresAuth: true,
      }),
  },

  admin: {
    stats: async (): Promise<AdminStats> =>
      apiCall<AdminStats>("/admin/stats", { requiresAuth: true }),

    listUsers: async (q = "", page = 1, pageSize = 20): Promise<AdminUserList> => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (q) params.append("q", q);
      return apiCall<AdminUserList>(`/admin/users?${params}`, { requiresAuth: true });
    },
    updateUser: async (
      id: number,
      data: { is_admin?: boolean; is_active?: boolean }
    ): Promise<AdminUser> =>
      apiCall<AdminUser>(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        requiresAuth: true,
      }),
    deleteUser: async (id: number): Promise<void> => {
      await apiCall<void>(`/admin/users/${id}`, { method: "DELETE", requiresAuth: true });
    },

    listIdeas: async (
      q = "",
      opts?: { hidden?: boolean; page?: number; pageSize?: number }
    ): Promise<AdminIdeaList> => {
      const params = new URLSearchParams({
        page: String(opts?.page ?? 1),
        page_size: String(opts?.pageSize ?? 20),
      });
      if (q) params.append("q", q);
      if (opts?.hidden != null) params.append("hidden", String(opts.hidden));
      return apiCall<AdminIdeaList>(`/admin/ideas?${params}`, { requiresAuth: true });
    },
    setIdeaHidden: async (id: number, hidden: boolean): Promise<AdminIdea> =>
      apiCall<AdminIdea>(`/admin/ideas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ hidden }),
        requiresAuth: true,
      }),
    deleteIdea: async (id: number): Promise<void> => {
      await apiCall<void>(`/admin/ideas/${id}`, { method: "DELETE", requiresAuth: true });
    },

    announce: async (text: string, email: boolean): Promise<{ delivered: number; emailing: number }> =>
      apiCall<{ delivered: number; emailing: number }>("/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ text, email }),
        requiresAuth: true,
      }),
    /** Inactive members (joined 30+ days ago) the catch-up email would reach. */
    catchUpPreview: async (): Promise<{ eligible: number; email_enabled: boolean }> =>
      apiCall<{ eligible: number; email_enabled: boolean }>("/admin/nudges/catch-up", { requiresAuth: true }),
    catchUpSend: async (): Promise<{ queued: number }> =>
      apiCall<{ queued: number }>("/admin/nudges/catch-up", { method: "POST", requiresAuth: true }),
    /** Sign-up -> activation -> join request -> accepted -> active team. */
    funnel: async (days = 30): Promise<TeamFunnel> =>
      apiCall<TeamFunnel>(`/admin/funnel?days=${days}`, { requiresAuth: true }),
    /** How many people a broadcast would reach (in-app / by email). */
    announcementAudience: async (): Promise<{ in_app: number; email: number }> =>
      apiCall<{ in_app: number; email: number }>("/admin/announcements/audience", { requiresAuth: true }),
  },
};
