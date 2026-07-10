"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, getAccessToken, getRealtimeUrl } from "@/lib/api/client";
import { Notification, Message } from "@/lib/api/types";
import { useAuth } from "@/lib/context/auth";

export type RealtimeEvent =
  | { type: "notification"; notification: Notification }
  | { type: "message"; conversation_id: number; message: Message };

type Listener = (event: RealtimeEvent) => void;

interface RealtimeContextType {
  connected: boolean;
  unreadNotifications: number;
  unreadMessages: number;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
  setUnreadMessages: React.Dispatch<React.SetStateAction<number>>;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const listeners = useRef<Set<Listener>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // Seed initial unread counts whenever we (re)authenticate.
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [n, convos] = await Promise.all([
          api.notifications.unreadCount(),
          api.messages.listConversations(),
        ]);
        if (cancelled) return;
        setUnreadNotifications(n);
        setUnreadMessages(convos.reduce((sum, c) => sum + (c.unread || 0), 0));
      } catch {
        /* ignore — counts default to 0 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Maintain the WebSocket connection.
  useEffect(() => {
    if (!isAuthenticated) return;

    closedByUs.current = false;

    const connect = () => {
      const token = getAccessToken();
      if (!token) return;

      const ws = new WebSocket(getRealtimeUrl(token));
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        let event: RealtimeEvent;
        try {
          event = JSON.parse(e.data);
        } catch {
          return;
        }
        if (event.type === "notification") {
          setUnreadNotifications((c) => c + 1);
        } else if (event.type === "message") {
          setUnreadMessages((c) => c + 1);
        }
        listeners.current.forEach((fn) => fn(event));
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!closedByUs.current) {
          reconnectTimer.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAuthenticated]);

  return (
    <RealtimeContext.Provider
      value={{
        connected,
        unreadNotifications,
        unreadMessages,
        setUnreadNotifications,
        setUnreadMessages,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return ctx;
}
