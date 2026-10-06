"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsWorkspaceProps {
  modules: ReactNode;
  company: ReactNode;
  landingPage: ReactNode;
  general: ReactNode;
  advanced: ReactNode;
}

const searchItems = [
  { label: "Module Configuration", description: "Browse settings for ERP modules", keywords: "modules configuration", tab: "modules" },
  { label: "Company Profile", description: "Company details, address and logo", keywords: "company profile organization", tab: "company" },
  { label: "Landing Page", description: "Login page, highlights and What's New", keywords: "landing login highlights whats new subtitle", tab: "landing-page" },
  { label: "General Settings", description: "Company details, prefixes and governance", keywords: "general company details prefixes governance", tab: "general" },
  { label: "Advanced", description: "System-level settings and configuration", keywords: "advanced system environment configuration", tab: "advanced" },
  { label: "Code Management", description: "System codes and reference data", keywords: "codes reference", href: "/settings/codes" },
  { label: "Invoice Settings", description: "Prefixes, terms and tax settings", keywords: "invoice billing tax", href: "/settings/invoice" },
  { label: "Packaging Settings", description: "Packaging and label fields", keywords: "packaging labels", href: "/settings/packaging" },
  { label: "Customer Settings", description: "Customer tiers and auto-tagging", keywords: "customer crm tags", href: "/settings/customer" },
  { label: "Loyalty Settings", description: "Earn, redeem and expiry rules", keywords: "loyalty rewards points", href: "/settings/loyalty" },
  { label: "Coupons", description: "Discount coupons and campaigns", keywords: "discount promotion", href: "/settings/coupons" },
  { label: "Invoice Promotions", description: "Invoice banners and customer rewards", keywords: "invoice banners dob anniversary", href: "/settings/invoice-promotions" },
  { label: "Email Templates", description: "Zoho Mail and invoice email templates", keywords: "email zoho mail templates", href: "/settings/email-templates" },
  { label: "WhatsApp Templates", description: "CRM message templates", keywords: "whatsapp message crm", href: "/settings/message-templates" },
  { label: "eBay Settings", description: "Marketplace listing images", keywords: "ebay marketplace images", href: "/settings/ebay-settings" },
  { label: "Marketplace Settings", description: "Fees, margins and pricing profiles", keywords: "marketplace shop pricing fees", href: "/settings/marketplaces" },
] as const;

export function SettingsWorkspace({
  modules,
  company,
  landingPage,
  general,
  advanced,
}: SettingsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("modules");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return searchItems
      .map((item) => {
        const title = item.label.toLocaleLowerCase();
        const description = item.description.toLocaleLowerCase();
        const keywords = item.keywords.toLocaleLowerCase();
        const score = title.startsWith(normalizedQuery) ? 3
          : title.includes(normalizedQuery) ? 2
            : description.includes(normalizedQuery) || keywords.includes(normalizedQuery) ? 1
              : 0;
        return { item, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 8)
      .map(({ item }) => item);
  }, [normalizedQuery]);

  const selectTab = (value: string) => {
    setActiveTab(value);
    setQuery("");
  };

  return (
    <div className="space-y-8">
      <div className="relative w-full md:ml-auto md:w-80">
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search settings"
          aria-autocomplete="list"
          aria-expanded={Boolean(normalizedQuery)}
          autoComplete="off"
          className="pl-9"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder="Search settings..."
          role="combobox"
          value={query}
        />
        {normalizedQuery && (
          <div
            className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
            role="listbox"
          >
            {results.length > 0 ? results.map((item) => (
              "href" in item ? (
                <Link
                  key={item.label}
                  className="block px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  href={item.href}
                  onClick={() => setQuery("")}
                  role="option"
                  aria-selected={false}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </Link>
              ) : (
                <button
                  key={item.label}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selectTab(item.tab)}
                  role="option"
                  aria-selected={false}
                  type="button"
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </button>
              )
            )) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">No matching settings. Try a module or setting name.</p>
            )}
          </div>
        )}
      </div>

      <Tabs className="space-y-4" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="modules">Module Configuration</TabsTrigger>
          <TabsTrigger value="company">Company Profile</TabsTrigger>
          <TabsTrigger value="landing-page">Landing Page</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-4" value="modules">{modules}</TabsContent>
        <TabsContent value="company">{company}</TabsContent>
        <TabsContent className="space-y-4" value="landing-page">{landingPage}</TabsContent>
        <TabsContent value="general">{general}</TabsContent>
        <TabsContent value="advanced">{advanced}</TabsContent>
      </Tabs>
    </div>
  );
}
