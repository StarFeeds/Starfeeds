import { TokenPair, User, Idea, IdeaListResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AuthTokens {
  access: string;
  refresh: string;
}

let storedTokens: AuthTokens | null = null;

function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  if (storedTokens) return storedTokens;
  const stored = localStorage.getItem("auth_tokens");
  return stored ? JSON.parse(stored) : null;
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

async function apiCall<T>(
  path: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<T> {
  const { requiresAuth = false, ...fetchOptions } = options;
  const url = `${API_URL}/api/v1${path}`;
  const headers = new Headers(fetchOptions.headers || {});

  if (requiresAuth) {
    const tokens = getStoredTokens();
    if (!tokens) {
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
      setStoredTokens(null);
      throw new Error("Session expired. Please log in again.");
    }
    const error = await resp.text();
    throw new Error(error || `API error: ${resp.status}`);
  }

  return resp.json();
}

export const api = {
  auth: {
    register: async (email: string, username: string, fullName: string, password: string): Promise<TokenPair> => {
      const tokens = await apiCall<TokenPair>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, full_name: fullName, password }),
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

    logout: () => {
      setStoredTokens(null);
    },
  },

  ideas: {
    list: async (page = 1, pageSize = 10, category?: string, sort: "recent" | "top" = "recent"): Promise<IdeaListResponse> => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort });
      if (category) params.append("category", category);
      return apiCall<IdeaListResponse>(`/ideas?${params}`, { requiresAuth: true });
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
  },
};
