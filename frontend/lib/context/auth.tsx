"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { disablePush } from "@/lib/push";
import { User } from "@/lib/api/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetchUser = async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
      return;
    } catch (err) {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refetchUser();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const logout = () => {
    setUser(null);
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
