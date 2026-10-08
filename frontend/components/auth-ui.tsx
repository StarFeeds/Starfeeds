"use client";

/* Shared building blocks for the Login / Register split-screen layouts. */

import { GOOGLE_CLIENT_ID, GoogleSignInButton } from "@/components/GoogleSignInButton";

/** Social sign-in (Google for now) plus the "or" divider; renders nothing
 *  until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. */
export function SocialSignIn({ text }: { text?: "continue_with" | "signup_with" | "signin_with" }) {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <>
      <GoogleSignInButton text={text} />
      <OrDivider />
    </>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4 text-neutral-500 text-sm">
      <span className="flex-1 h-px bg-neutral-200" />
      or
      <span className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}

export function AuthHero({
  side,
  title,
  subtitle,
}: {
  side: "left" | "right";
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`hidden lg:block relative w-1/2 overflow-hidden ${
        side === "left" ? "order-first" : "order-last"
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/auth-hero.png')" }}
      />
      {/* Brand wash + decorative blobs */}
      <div className="absolute -left-24 bottom-10 w-72 h-72 rounded-full bg-primary-500/30 blur-3xl" />
      <div className="absolute right-0 -top-10 w-72 h-72 rounded-full bg-secondary-500/30 blur-3xl" />
      {title && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-neutral-900/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
            <h2 className="text-3xl font-bold leading-tight mb-3">{title}</h2>
            {subtitle && <p className="text-base text-white/85 max-w-sm">{subtitle}</p>}
          </div>
        </>
      )}
    </div>
  );
}
