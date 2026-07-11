import {
  TokenPair,
  User,
  Idea,
  IdeaListResponse,
  Comment,
  Notification,
  CollaborationRequest,
  Conversation,
  Message,
  UserUpdate,
  NotificationPrefs,
  SearchResults,
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

    listComments: async (ideaId: number): Promise<Comment[]> => {
      return apiCall<Comment[]>(`/ideas/${ideaId}/comments`, { requiresAuth: true });
    },

    addComment: async (ideaId: number, body: string): Promise<Comment> => {
      return apiCall<Comment>(`/ideas/${ideaId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
        requiresAuth: true,
      });
    },

    expressInterest: async (ideaId: number): Promise<CollaborationRequest> => {
      return apiCall<CollaborationRequest>(`/ideas/${ideaId}/interest`, {
        method: "POST",
        requiresAuth: true,
      });
    },

    create: async (title: string, body: string, category: string): Promise<Idea> => {
      return apiCall<Idea>("/ideas", {
        method: "POST",
        body: JSON.stringify({ title, body, category, visibility: "public" }),
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
};
