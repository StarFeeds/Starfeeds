"use client";

/* Shared building blocks for the Login / Register split-screen layouts. */

export function SocialButtons() {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="flex-1 h-11 flex items-center justify-center border border-neutral-300 rounded-lg hover:bg-neutral-50 transition"
        aria-label="Continue with Google"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
      </button>
      <button
        type="button"
        className="flex-1 h-11 flex items-center justify-center bg-[#1877F2] rounded-lg hover:opacity-90 transition"
        aria-label="Continue with Facebook"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
        </svg>
      </button>
      <button
        type="button"
        className="flex-1 h-11 flex items-center justify-center bg-neutral-900 rounded-lg hover:bg-neutral-700 transition"
        aria-label="Continue with Apple"
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 12.54c-.02-2.07 1.69-3.06 1.77-3.11-.96-1.41-2.46-1.6-3-1.62-1.27-.13-2.49.75-3.14.75-.65 0-1.65-.73-2.71-.71-1.39.02-2.68.81-3.4 2.06-1.45 2.52-.37 6.25 1.04 8.29.69 1 1.51 2.12 2.58 2.08 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.71.65 1.12-.02 1.83-1.02 2.51-2.03.79-1.16 1.12-2.29 1.13-2.35-.02-.01-2.17-.83-2.19-3.31zM15.1 5.46c.57-.7.96-1.66.85-2.62-.83.03-1.83.55-2.42 1.24-.53.61-.99 1.6-.86 2.54.92.07 1.86-.47 2.43-1.16z" />
        </svg>
      </button>
    </div>
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
