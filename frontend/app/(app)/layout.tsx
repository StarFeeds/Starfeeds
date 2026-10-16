"use client";

import { useAuth } from "@/lib/context/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FeedSkeleton } from "@/components/Skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50" role="status" aria-label="Loading">
        <div className="h-16 bg-white border-b border-neutral-200" />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <FeedSkeleton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
