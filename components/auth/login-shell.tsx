import type { ReactNode } from "react";
import { Globe, ShieldCheck } from "lucide-react";
import { CompanyLogo } from "./company-logo";

type Highlight = { title: string; desc: string };
export function LoginShell({ companyName, logoUrl, subtitle, accessNotice, highlights, whatsNewText, whatsNewItems, children }: {
  companyName: string; logoUrl: string; subtitle: string; accessNotice: string;
  highlights: Highlight[]; whatsNewText: string | undefined; whatsNewItems: string[]; children: ReactNode;
}) {
  return <main className="auth-shell min-h-dvh bg-background text-foreground">
    <div className="mx-auto grid min-h-dvh w-full max-w-[1280px] lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,1fr)]">
      <section className="hidden min-w-0 flex-col justify-between border-r border-border p-10 lg:flex xl:p-12" aria-label="KhyatiGems workspace">
        <CompanyLogo className="auth-brand" size="md" logoUrl={logoUrl} companyName={companyName} />
        <div className="max-w-lg space-y-8 py-12">
          <div className="space-y-4"><p className="text-sm text-muted-foreground">Gemstone trading workspace</p><h1 className="text-4xl font-medium leading-tight tracking-tight xl:text-5xl">Inventory, channels<br />and invoices together</h1><p className="max-w-md text-base leading-relaxed text-muted-foreground">{subtitle}</p></div>
          {highlights.length > 0 && <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-border pt-6">{highlights.map((item, index) => <div key={`${item.title}-${index}`} className="space-y-1"><dt className="text-sm font-medium">{item.title}</dt><dd className="text-sm leading-relaxed text-muted-foreground">{item.desc}</dd></div>)}</dl>}
          {(whatsNewText || whatsNewItems.length > 0) && <aside className="space-y-3 border-t border-border pt-6"><h2 className="text-sm font-medium">What’s new</h2>{whatsNewText && <p className="text-sm leading-relaxed text-muted-foreground">{whatsNewText}</p>}{whatsNewItems.length > 0 && <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">{whatsNewItems.slice(0, 3).map((item, index) => <li key={index}>{item}</li>)}</ul>}</aside>}
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {companyName}</p>
      </section>
      <section className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-8 lg:px-10 xl:px-12" aria-label="Sign in">
        <div className="mb-10 flex items-center justify-between gap-4"><div className="lg:hidden"><CompanyLogo className="auth-brand" size="sm" logoUrl={logoUrl} companyName={companyName} /></div><a href="https://www.khyatigems.com" target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Globe size={16} strokeWidth={1.5} />Visit site</a></div>
        <div className="mx-auto w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <header className="space-y-3"><h2 className="text-2xl font-medium">Sign in to {companyName}</h2><p className="text-sm leading-relaxed text-muted-foreground">Use your account to manage gemstone inventory, sales and operations</p></header>
          {children}
          <p className="flex items-start gap-2 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 shrink-0" size={16} strokeWidth={1.5} />{accessNotice}</p>
        </div>
      </section>
    </div>
  </main>;
}
