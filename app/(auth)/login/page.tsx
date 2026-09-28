import { LoginForm } from "@/components/auth/login-form";
import { Shield, Clock, Lock, Globe } from "lucide-react";

import { CompanyLogo } from "@/components/auth/company-logo";
import { getCompanyBranding } from "@/lib/company";
import whiteLogo from "@/public/khyati-gems-icon-white.png";

export const dynamic = "force-dynamic";

// Statically imported so Next bundles it under /_next/static (always served,
// no dev-server public-folder refresh or middleware redirect can break it).
const WHITE_LOGO = whiteLogo.src;

const TRUST_ITEMS = [
  { icon: Shield, title: "BIS Hallmarked", desc: "Certified compliance" },
  { icon: Lock, title: "Role-based", desc: "Internal staff only" },
  { icon: Clock, title: "Audit trail", desc: "Full activity logs" },
  { icon: Shield, title: "12K SKUs", desc: "Managed daily" },
];

export default async function LoginPage() {
  const branding = await getCompanyBranding();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b12] text-white">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,188,122,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(100,116,139,0.25),transparent_30%)]" />
      <div aria-hidden className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />

      <div aria-hidden className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[#D9BC7A]/15 blur-3xl" />
      <div aria-hidden className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div aria-hidden className="absolute right-28 top-24 h-4 w-4 rounded-full bg-[#D9BC7A] shadow-[0_0_24px_rgba(217,188,122,1)]" />
      <div aria-hidden className="absolute left-24 bottom-24 h-3 w-3 rounded-full bg-white/80 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <div className="relative hidden flex-1 flex-col justify-between p-8 lg:flex xl:p-12">
          <div className="flex items-center justify-between">
            <CompanyLogo
              variant="white"
              size="md"
              logoUrl={WHITE_LOGO}
              companyName={branding.companyName}
            />
            <span className="rounded-full border border-[#D9BC7A]/40 bg-[#D9BC7A]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F3DFA7]">
              Secure access
            </span>
          </div>

          <div className="max-w-xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              Trusted internal workspace
            </p>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white xl:text-6xl">
              Welcome back to
              <span className="mt-3 block bg-linear-to-r from-[#F6E7BF] via-[#D9BC7A] to-[#CFAE62] bg-clip-text text-transparent">
                {branding.companyName}
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-base text-slate-300 xl:text-lg">
              Centralized inventory, sales, and operations — powered by a secure,
              role-based platform built for modern gemstone businesses.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.35)] backdrop-blur-lg transition-transform duration-200 hover:-translate-y-1"
                >
                  <item.icon className="mb-3 h-5 w-5 text-[#D9BC7A]" />
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} {branding.companyName}. All rights
            reserved.
          </div>
        </div>

        <div className="relative z-10 flex w-full items-center justify-center p-5 sm:p-8 lg:w-135 xl:w-155">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.8)] backdrop-blur-xl sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="lg:hidden">
                <CompanyLogo
                  variant="white"
                  size="md"
                  logoUrl={WHITE_LOGO}
                  companyName={branding.companyName}
                />
              </div>

              <a
                href="https://www.khyatigems.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#D9BC7A]/40 bg-[#D9BC7A]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F1D89C] transition-all duration-300 hover:bg-[#D9BC7A] hover:text-[#1A1408]"
              >
                <Globe className="h-3.5 w-3.5" />
                Visit site
              </a>
            </div>

            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#D9BC7A]">
                Sign in
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                Access your workspace
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Secure access to {branding.companyName} ERP
              </p>
            </div>

            <LoginForm />

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Role-based access control • v2.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
