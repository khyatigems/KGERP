"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GemCursor } from "@/components/auth/effects/gem-cursor";
import { GemParticles } from "@/components/auth/effects/gem-particles";
import { FadeIn } from "@/components/auth/effects/fade-in";
import { CompanyLogoClient } from "@/components/auth/company-logo-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Something went wrong");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-950 relative overflow-hidden">
      <GemCursor />

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <GemParticles />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <FadeIn delay={100}>
            <CompanyLogoClient variant="dark" size="md" />
          </FadeIn>

          <FadeIn delay={300}>
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight mb-3">
                Forgot your<br />password?
              </h1>
              <p className="text-slate-400 text-base max-w-md">
                No worries — enter your email and we&apos;ll help you reset it. You&apos;ll receive instructions on how to securely change your password.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={500}>
            <div className="space-y-3 max-w-md">
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Secure token-based reset</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Link expires in 1 hour</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>No password is ever stored in plain text</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-8">
            <FadeIn delay={400}>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </FadeIn>

            {success ? (
              <FadeIn delay={500}>
                <div className="text-center space-y-5">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Check your email</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      If an account exists for <strong className="text-slate-700 dark:text-slate-300">{email}</strong>, you&apos;ll receive password reset instructions.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-block text-sm text-[#1a73e8] hover:underline"
                  >
                    Return to sign in
                  </Link>
                </div>
              </FadeIn>
            ) : (
              <>
                <FadeIn delay={500} direction="up">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">Reset password</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Enter the email address associated with your account.
                    </p>
                  </div>
                </FadeIn>

                <FadeIn delay={650} direction="up">
                  <form onSubmit={onSubmit} className="space-y-5">
                    {error && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                        {error}
                      </div>
                    )}

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="Email address"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 pl-11 pr-4 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] focus-visible:ring-2 focus-visible:ring-[#1a73e8] focus-visible:border-[#1a73e8]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#185abc] text-white font-medium text-sm tracking-wide transition-colors shadow-sm"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                  </form>
                </FadeIn>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 px-6 sm:px-12 py-4">
          <div className="max-w-sm mx-auto lg:mx-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <select className="bg-transparent text-xs text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer">
              <option>English (US)</option>
            </select>
              <div className="flex items-center gap-4">
                <Link href="/help" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Help</Link>
                <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Terms</Link>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
