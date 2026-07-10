"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/context/auth";
import { AuthHero, SocialButtons, OrDivider } from "@/components/auth-ui";
import { Logo } from "@/components/Logo";

const ACCOUNT_TYPES = ["Investor", "Mentor", "Innovator"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

function passwordStrength(pw: string): { label: string; level: 0 | 1 | 2 | 3 } {
  if (!pw) return { label: "", level: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const map = ["Weak", "Weak", "Medium", "Strong"] as const;
  return { label: map[score], level: score as 0 | 1 | 2 | 3 };
}

function deriveUsername(email: string): string {
  let u = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
  // Backend requires >= 3 chars; pad short local-parts (e.g. "ab@x.com").
  if (u.length < 3) u = (u + "user").slice(0, 8);
  return u;
}

export default function RegisterPage() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>("Investor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const confirmStrength = passwordStrength(confirm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.auth.register(email, deriveUsername(email), fullName, password);
      await refetchUser();
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = (level: number) =>
    level >= 3 ? "text-success-500" : level === 2 ? "text-primary-600" : "text-destructive-500";

  return (
    <div className="min-h-screen flex bg-white">
      {/* Form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-6">
              <Logo size={64} />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">Create an account</h1>
              <p className="text-sm text-neutral-600">Create using your account</p>
            </div>

            <div className="space-y-4">
              <SocialButtons />
              <OrDivider />

              {error && (
                <div className="p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg">
                  <p className="text-sm text-destructive-500">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account type */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Account Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAccountType(t)}
                        className={`h-10 rounded-lg text-sm font-semibold border transition ${
                          accountType === t
                            ? "border-primary-600 bg-primary-50 text-primary-700"
                            : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    required
                  />
                  {strength.label && (
                    <p className="text-xs mt-1 text-neutral-500">
                      Password strength:{" "}
                      <span className={`font-semibold ${strengthColor(strength.level)}`}>
                        {strength.label}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    required
                  />
                  {confirm && (
                    <p className="text-xs mt-1 text-neutral-500">
                      {confirm === password ? (
                        <span className="font-semibold text-success-500">Passwords match</span>
                      ) : (
                        <span className="font-semibold text-destructive-500">
                          Passwords don&apos;t match
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white font-semibold rounded-lg transition"
                >
                  {loading ? "Creating account..." : "Sign up"}
                </button>
              </form>

              <p className="text-center text-sm text-neutral-600">
                Already have an account?{" "}
                <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
        <footer className="py-6 text-center text-xs text-neutral-500">
          © Starfeeds Technology 2025
        </footer>
      </div>

      <AuthHero
        side="right"
        title="Join the Innovation Community"
        subtitle="Share ideas, get feedback, and connect with mentors & investors."
      />
    </div>
  );
}
