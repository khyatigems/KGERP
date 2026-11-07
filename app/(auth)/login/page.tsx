import { LoginForm } from "@/components/auth/login-form";
import { LoginShell } from "@/components/auth/login-shell";

import { getCompanyBranding } from "@/lib/company";
import { getLandingPageSettings, getWhatsNewEntries } from "@/app/(dashboard)/settings/landing-page/actions";
import whiteLogo from "@/public/khyati-gems-icon-white.png";

export const dynamic = "force-dynamic";

// Statically imported so Next bundles it under /_next/static (always served,
// no dev-server public-folder refresh or middleware redirect can break it).
const WHITE_LOGO = whiteLogo.src;

const TRUST_ITEMS = [
  { title: "Inventory", desc: "Gemstones, images and certificates" },
  { title: "Sales & invoices", desc: "Domestic and export transactions" },
  { title: "Marketplace channels", desc: "eBay and Etsy operations" },
  { title: "Account permissions", desc: "Access based on your role" },
];

export default async function LoginPage() {
  const [branding, landingSettings, whatsNewEntries] = await Promise.all([
    getCompanyBranding(),
    getLandingPageSettings(),
    getWhatsNewEntries(),
  ]);
  const configuredHighlights: string[] = Array.isArray(landingSettings.highlights)
    ? landingSettings.highlights.filter((title): title is string => typeof title === "string")
    : [];
  const loginHighlights = landingSettings.highlightsEnabled && configuredHighlights.length > 0
    ? configuredHighlights.map((title) => {
        const item = TRUST_ITEMS.find((trustItem) => trustItem.title === title);
        return {
          title,
          desc: item?.desc ?? "ERP operations",
        };
      })
    : landingSettings.highlightsEnabled ? TRUST_ITEMS : [];
  const whatsNewItems = landingSettings.whatsNewEnabled
    ? whatsNewEntries.map((entry) => entry.message).filter(Boolean)
    : [];
  const whatsNewText = landingSettings.whatsNewEnabled ? landingSettings.whatsNewText?.trim() : "";

  return <LoginShell companyName={branding.companyName} logoUrl={WHITE_LOGO} subtitle={landingSettings.subtitle} accessNotice={landingSettings.accessNotice} highlights={loginHighlights} whatsNewText={whatsNewText} whatsNewItems={whatsNewItems}><LoginForm /></LoginShell>;
}
