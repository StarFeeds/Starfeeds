import type { MetadataRoute } from "next";

/** Lets people "Add to Home Screen" (needed for push on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LikeMinds",
    short_name: "LikeMinds",
    description: "Share what you're building and find people to build it with.",
    start_url: "/home",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4d0695",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
