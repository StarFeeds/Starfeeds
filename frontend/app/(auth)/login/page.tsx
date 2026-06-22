"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.login(email, password);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md p-8 border border-neutral-200">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Log In</h1>
            <p className="text-neutral-600">Welcome back to StarFeeds</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive-500/10 border border-destructive-500/20 rounded-lg">
              <p className="text-sm text-destructive-500">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-neutral-600">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-xs text-neutral-600 mb-2 font-semibold">Demo Login:</p>
            <p className="text-xs text-neutral-700 font-mono">demo@starfeeds.app</p>
            <p className="text-xs text-neutral-700 font-mono">password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
