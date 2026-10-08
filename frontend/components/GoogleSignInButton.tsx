"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/context/auth";
import { nextPath } from "@/lib/share";

/** Public OAuth Web client ID; unset = Google sign-in is hidden. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Minimal typing for the bits of Google Identity Services we use.
type GsiButtonOptions = {
  theme: "outline" | "filled_blue" | "filled_black";
  size: "large" | "medium" | "small";
  shape: "pill" | "rectangular";
  text: "continue_with" | "signin_with" | "signup_with";
  width?: number;
  logo_alignment?: "left" | "center";
};
type Gsi = {
  accounts: {
    id: {
      initialize(opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: "popup" }): void;
      renderButton(el: HTMLElement, opts: GsiButtonOptions): void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

let gsiLoading: Promise<Gsi> | null = null;
function loadGsi(): Promise<Gsi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  gsiLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google script failed")));
    s.onerror = () => {
      gsiLoading = null;
      reject(new Error("Couldn't load Google sign-in"));
    };
    document.head.appendChild(s);
  });
  return gsiLoading;
}

/**
 * Google's own "Continue with Google" button. Signs in an existing account
 * (matched by email) or creates one, then continues to ?next= or /home.
 */
export function GoogleSignInButton({ text = "continue_with" }: { text?: GsiButtonOptions["text"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest handler for Google's (registered-once) callback.
  const onCredential = useRef<(credential: string) => void>(() => {});
  useEffect(() => {
    onCredential.current = async (credential) => {
      setBusy(true);
      setError(null);
      try {
        await api.auth.google(credential);
        await refetchUser();
        router.push(nextPath());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
        setBusy(false);
      }
    };
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then((g) => {
        if (cancelled || !ref.current) return;
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => onCredential.current(r.credential),
          ux_mode: "popup",
        });
        g.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text,
          width: Math.min(400, ref.current.offsetWidth || 320),
          logo_alignment: "center",
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="space-y-2">
      <div className={`flex justify-center min-h-[44px] ${busy ? "opacity-50 pointer-events-none" : ""}`}>
        <div ref={ref} className="w-full max-w-[400px] flex justify-center" />
      </div>
      {busy && <p className="text-center text-sm text-neutral-500">Signing you in…</p>}
      {error && <p className="text-center text-sm text-destructive-500">{error}</p>}
    </div>
  );
}
