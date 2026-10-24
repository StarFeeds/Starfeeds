"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { disablePush } from "@/lib/push";
import { captureRef } from "@/lib/referral";
import { User } from "@/lib/api/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The last /auth/me response, so returning visitors see the app straight
// away instead of waiting on the API; it's refreshed in the background.
const USER_CACHE_KEY = "lm_user";

function readCachedUser(): User | null {
  try {
    if (!localStorage.getItem("auth_tokens")) return null;
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem("lm_feed"); // shows the previous account's likes
    }
  } catch {
    // storage full or blocked: the cache is only a speed-up
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetchUser = async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
      writeCachedUser(me);
      return;
    } catch (err) {
      // A network blip or a cold API shouldn't sign anyone out: only drop the
      // user once the client has discarded the tokens (session expired).
      let hasTokens = false;
      try {
        hasTokens = !!localStorage.getItem("auth_tokens");
      } catch {}
      if (!hasTokens || !readCachedUser()) {
        setUser(null);
        writeCachedUser(null);
      }
    }
  };

  useEffect(() => {
    captureRef(); // every page is wrapped in this provider
    const cached = readCachedUser();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
    }
    refetchUser().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    setUser(null);
    writeCachedUser(null);
    // Stop this browser getting the old account's notifications (shared
    // devices), then drop the tokens the unsubscribe call needs.
    disablePush()
      .catch(() => {})
      .finally(() => api.auth.logout());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
