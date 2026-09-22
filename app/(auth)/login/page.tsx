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
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-slate-950">
      {/* Full-page gemstone background + readability overlay */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-slate-950/70" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-slate-950/85"
      />

      {/* Left brand panel */}
      <div className="relative z-10 hidden lg:flex flex-1 flex-col justify-between p-12">
        <CompanyLogo
          variant="white"
          size="md"
          logoUrl={WHITE_LOGO}
          companyName={branding.companyName}
        />

        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Trust built facet by facet.
          </h1>
          <p className="mt-3 text-slate-300 text-base max-w-md">
            Centralized inventory, sales, and operations — all in one secure,
            role-based platform built for jewelry and gemstone businesses.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.title}
                className="p-3 rounded-lg bg-white/10 backdrop-blur border border-white/15"
              >
                <item.icon className="h-4 w-4 text-[#D9BC7A] mb-1.5" />
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-slate-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} {branding.companyName}. All rights
          reserved.
        </div>
      </div>

      {/* Right form panel — fixed width docked to the right edge, no gap */}
      <div className="relative z-10 w-full flex flex-col shrink-0 lg:w-[520px] xl:w-[560px] bg-slate-950/95 backdrop-blur border-t lg:border-t-0 lg:border-l border-white/10">
        <div className="flex justify-end p-4 sm:p-6">
          <a
            href="https://www.khyatigems.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9BC7A]/40 text-[#D9BC7A] px-3.5 py-2 text-xs font-medium hover:bg-[#D9BC7A] hover:text-[#1A1408] transition-all duration-300"
          >
            <Globe className="h-3.5 w-3.5" />
            Visit KhyatiGems.com
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="lg:hidden flex justify-center">
              <CompanyLogo
                variant="white"
                size="lg"
                logoUrl={WHITE_LOGO}
                companyName={branding.companyName}
              />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">
                Sign in
              </h2>
              <p className="text-sm text-slate-400">
                Internal staff access to {branding.companyName} ERP
              </p>
            </div>

            <LoginForm />

            <p className="text-center text-xs text-slate-500">
              Secured with role-based access control &bull; v2.0
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 sm:px-12 py-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Internal Operations Platform</span>
            <span>&copy; {new Date().getFullYear()} Khyati Gems</span>
          </div>
        </div>
      </div>
    </div>
  );
}
