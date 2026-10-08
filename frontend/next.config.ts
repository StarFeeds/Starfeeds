import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Google's OAuth client ID is public (it's in every sign-in page), so it's
    // safe to bundle. Read it from GOOGLE_CLIENT_ID too, since Vercel may not
    // allow saving a NEXT_PUBLIC_ name. Inlined at build time: redeploy after changing.
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
  },
};

export default nextConfig;
