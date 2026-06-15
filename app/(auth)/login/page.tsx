import { LoginForm } from "@/components/auth/login-form";
import { getLandingPageSettings } from "@/app/(dashboard)/settings/landing-page/actions";
import { Check, Sparkles, Shield, Globe, BarChart3, Package, FileText } from "lucide-react";

import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/auth/effects/fade-in";
import { ShimmerText } from "@/components/auth/effects/shimmer-text";
import { CompanyLogo } from "@/components/auth/company-logo";
import { getCompanyBranding } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getLandingPageSettings();
  const branding = await getCompanyBranding();
  const highlights = settings.highlightsEnabled ? settings.highlights : [];

  let whatsNewEntries: { id: string; message: string; createdAt: Date }[] = [];
  try {
    const hasWhatsNew = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='WhatsNewEntry'`
    );
    if (hasWhatsNew.length > 0) {
      whatsNewEntries = (await prisma.$queryRawUnsafe<Array<{ id: string; message: string; createdAt: string }>>(
        `SELECT id, message, "createdAt" FROM "WhatsNewEntry" ORDER BY "createdAt" DESC LIMIT 5`
      )).map((e) => ({ ...e, createdAt: new Date(e.createdAt) }));
    }
  } catch {}

  const latestWhatsNew = whatsNewEntries[0];
  const olderWhatsNew = whatsNewEntries.slice(1);

  const featureCards = [
    { icon: Package, title: "Inventory", desc: "SKU & stock management" },
    { icon: FileText, title: "Sales", desc: "Quotations & invoices" },
    { icon: BarChart3, title: "Reports", desc: "Real-time analytics" },
    { icon: Shield, title: "Secure", desc: "Role-based access" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-950 relative overflow-hidden">

      {/* Left Brand Panel - desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <FadeIn delay={100} direction="down">
            <div className="mb-2">
              <CompanyLogo
                variant="dark"
                size="md"
                logoUrl={branding.logoUrl}
                companyName={branding.companyName}
              />
            </div>
            <p className="text-sm text-slate-400 mt-1">Internal Operations Platform</p>
          </FadeIn>

          <div className="space-y-8">
            <FadeIn delay={300} direction="up">
              <div>
                <h1 className="text-4xl font-bold leading-tight tracking-tight mb-3">
                  Manage your gem business
                  <br />
                  <ShimmerText>with confidence</ShimmerText>
                </h1>
                <p className="text-slate-400 text-base max-w-md">
                  Centralized inventory, sales, and operations — all in one secure, role-based platform built for jewelry and gemstone businesses.
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              {featureCards.map((f, i) => (
                <FadeIn key={f.title} delay={500 + i * 80} direction="up">
                  <div className="group p-3 rounded-lg bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 hover:border-indigo-400/30 transition-all duration-300">
                    <div className="relative">
                      <f.icon className="h-4 w-4 text-blue-400 mb-1.5 transition-transform group-hover:scale-110" />
                    </div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-slate-400">{f.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            {highlights.length > 0 && (
              <FadeIn delay={900} direction="up">
                <div className="space-y-2 max-w-md">
                  {highlights.slice(0, 3).map((h: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            )}
          </div>

          <FadeIn delay={1100} direction="up">
            <div className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} {branding.companyName}. All rights reserved.
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 relative">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-8">
            <FadeIn delay={400} direction="down" className="lg:hidden text-center space-y-2">
              <CompanyLogo
                variant="light"
                size="lg"
                className="justify-center"
                logoUrl={branding.logoUrl}
                companyName={branding.companyName}
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{settings.subtitle}</p>
            </FadeIn>

            <FadeIn delay={500} direction="up">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">Sign in</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  to continue to {settings.brandTitle}
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={650} direction="up">
              <LoginForm />
            </FadeIn>

            <FadeIn delay={900} direction="up">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                {settings.accessNotice}
              </p>
            </FadeIn>
          </div>
        </div>

        {latestWhatsNew && settings.whatsNewEnabled && (
          <FadeIn delay={1100} direction="up">
            <div className="px-6 sm:px-12 pb-6">
              <div className="max-w-sm mx-auto lg:mx-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                    <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">What&apos;s new</span>
                      <span className="text-[10px] text-slate-400">
                        {formatDistanceToNow(latestWhatsNew.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{latestWhatsNew.message}</p>
                    {olderWhatsNew.length > 0 && (
                      <details className="mt-1.5 group">
                        <summary className="text-[11px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline list-none flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform">▸</span>
                          {olderWhatsNew.length} earlier update{olderWhatsNew.length !== 1 ? "s" : ""}
                        </summary>
                        <div className="mt-1.5 space-y-1 pl-3 border-l-2 border-slate-200 dark:border-slate-800">
                          {olderWhatsNew.map((entry) => (
                            <div key={entry.id} className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              {entry.message}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        )}

        <div className="border-t border-slate-200 dark:border-slate-800 px-6 sm:px-12 py-4">
          <div className="max-w-sm mx-auto lg:mx-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <select className="bg-transparent text-xs text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer">
              <option>English (US)</option>
            </select>
            <span>&copy; {new Date().getFullYear()} Khyati Gems</span>
          </div>
        </div>
      </div>
    </div>
  );
}
