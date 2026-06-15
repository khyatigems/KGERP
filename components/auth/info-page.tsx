"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GemCursor } from "@/components/auth/effects/gem-cursor";
import { GemParticles } from "@/components/auth/effects/gem-particles";
import { FadeIn } from "@/components/auth/effects/fade-in";
import { CompanyLogoClient } from "@/components/auth/company-logo-client";
import { cn } from "@/lib/utils";

interface InfoPageProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function InfoPage({ title, subtitle, lastUpdated, children }: InfoPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 relative overflow-hidden">
      <GemCursor />

      <div className="flex-1 flex">
        <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <GemParticles />
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <FadeIn delay={100}>
              <CompanyLogoClient variant="dark" size="md" />
            </FadeIn>

            <FadeIn delay={300}>
              <div>
                <h1 className="text-5xl font-bold leading-tight tracking-tight mb-3">{title}</h1>
                <p className="text-slate-400 text-base max-w-md">{subtitle}</p>
              </div>
            </FadeIn>

            <FadeIn delay={500}>
              <div className="text-xs text-slate-500">
                Last updated: {lastUpdated}
              </div>
            </FadeIn>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <div className="lg:hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
            <div className="mb-3">
              <CompanyLogoClient variant="dark" size="md" />
            </div>
            <h1 className="text-2xl font-bold mt-3">{title}</h1>
            <p className="text-sm text-slate-300 mt-1">{subtitle}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-6 sm:p-12 space-y-8">
              <FadeIn delay={400}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </FadeIn>

              <FadeIn delay={500}>
                <article className="prose prose-slate dark:prose-invert max-w-none">
                  {children}
                </article>
              </FadeIn>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 px-6 sm:px-12 py-4">
            <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>&copy; {new Date().getFullYear()} Khyati Gems. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <Link href="/help" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Help</Link>
                <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
