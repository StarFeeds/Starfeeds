"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthHero } from "@/components/auth-ui";
import { Logo } from "@/components/Logo";

type Step = "email" | "verify" | "reset" | "done";

const inputCls =
  "w-full px-4 h-11 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
const labelCls = "block text-sm font-semibold text-neutral-700 mb-1.5";
const primaryBtn =
  "w-full h-12 bg-neutral-900 hover:bg-neutral-700 disabled:bg-neutral-400 text-white font-semibold rounded-lg transition";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleCodeChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
  };

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("verify");
  };

  const submitVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.some((c) => !c)) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setError("");
    setStep("reset");
  };

  const submitReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setStep("done");
  };

  return (
    <div className="min-h-screen flex bg-white">
      <AuthHero side="left" />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Logo size={64} />
            </div>

            {error && (
              <div className="mb-5 p-3 bg-destructive-500/10 border border-destructive-500/20 rounded-lg">
                <p className="text-sm text-destructive-500">{error}</p>
              </div>
            )}

            {step === "email" && (
              <form onSubmit={submitEmail} className="space-y-5">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-neutral-900 mb-1">Forgot Password</h1>
                  <p className="text-sm text-neutral-600">
                    Enter your email and we&apos;ll send you a reset code.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <button type="submit" className={primaryBtn}>
                  Send code
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={submitVerify} className="space-y-5">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-neutral-900 mb-1">Verify</h1>
                  <p className="text-sm text-neutral-600">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-semibold text-neutral-900">{email || "your email"}</span>.
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeRefs.current[i] = el;
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      value={c}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-neutral-600">
                  Didn&apos;t get a code?{" "}
                  <button type="button" className="font-semibold text-primary-600 hover:text-primary-700">
                    Resend
                  </button>
                </p>
                <button type="submit" className={primaryBtn}>
                  Verify
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={submitReset} className="space-y-5">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-neutral-900 mb-1">Reset Password</h1>
                  <p className="text-sm text-neutral-600">Choose a new password for your account.</p>
                </div>
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a new password"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                  />
                </div>
                <button type="submit" className={primaryBtn}>
                  Reset Password
                </button>
              </form>
            )}

            {step === "done" && (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-success-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 mb-1">Successful</h1>
                  <p className="text-sm text-neutral-600">
                    Your password has been reset. You can now log in with your new password.
                  </p>
                </div>
                <button onClick={() => router.push("/login")} className={primaryBtn}>
                  Back to login
                </button>
              </div>
            )}

            {step !== "done" && (
              <p className="text-center text-sm text-neutral-600 mt-6">
                Remembered it?{" "}
                <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Log in
                </Link>
              </p>
            )}
          </div>
        </div>
        <footer className="py-6 text-center text-xs text-neutral-500">
          © Starfeeds Technology 2025
        </footer>
      </div>
    </div>
  );
}
