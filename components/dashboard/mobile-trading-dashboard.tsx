"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Files, Gem, History, RefreshCw, Sparkles, Store, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceLogo } from "@/components/ui/marketplace-logo";
import { permissionLabel } from "@/lib/permission-display";
import type { TradingDashboardData } from "@/lib/trading-dashboard-types";
import { count, amount, timestamp } from "@/lib/trading-dashboard-format";

type Section = "overview" | "stock" | "channels" | "invoices" | "activity";
type Activity = TradingDashboardData["activity"][number];

export function MobileTradingDashboard({ data, refreshing, onRefresh, error, onActivity }: {
  data: TradingDashboardData; refreshing: boolean; onRefresh: () => void; error: string; onActivity: (activity: Activity) => void;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [invoiceType, setInvoiceType] = useState("all");
  const [actorId, setActorId] = useState("all");
  const { access, inventory, marketplace, invoices, customers } = data;
  const sections: { id: Section; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...(access.inventory ? [{ id: "stock" as const, label: "Stock" }] : []),
    ...(access.listings ? [{ id: "channels" as const, label: "Channels" }] : []),
    ...(access.sales ? [{ id: "invoices" as const, label: "Invoices" }] : []),
    ...(access.activity ? [{ id: "activity" as const, label: "Activity" }] : []),
  ];
  // Permission changes must never leave a previously selected section visible.
  const current = sections.some(item => item.id === section) ? section : "overview";
  const overview = current === "overview";
  const metrics = [
    ...(access.inventory ? [{ label: "Available stock", value: inventory?.total, Icon: Gem, target: "stock" as const }] : []),
    ...(access.listings ? [{ label: "Active listings", value: marketplace?.total, Icon: Store, target: "channels" as const }] : []),
    ...(access.inventory && access.listings ? [{ label: "Ready to list", value: inventory?.preparedUnlisted, Icon: Sparkles, target: "stock" as const }] : []),
    ...(access.sales ? [{ label: "Monthly invoices", value: invoices?.total, Icon: Files, target: "invoices" as const }] : []),
  ];
  const actors = [...new Map(data.activity.map(log => [log.actorId || "system", log.actor])).entries()];
  const effectiveActor = actors.some(([id]) => id === actorId) ? actorId : "all";
  const activity = data.activity.filter(log => effectiveActor === "all" || (log.actorId || "system") === effectiveActor).slice(0, overview ? 2 : 6);
  const recentInvoices = (invoices?.recent || []).filter(invoice => overview || invoiceType === "all" || invoice.type === invoiceType).slice(0, overview ? 2 : 4);
  const shops = marketplace?.shops || [];
  const syncErrors = shops.reduce((sum, shop) => sum + shop.errors, 0);
  return <div className="mobile-trading-dashboard space-y-4" data-testid="mobile-trading-dashboard">
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Gemstone trading</p><h1 className="mt-0.5 text-xl font-semibold tracking-tight">Your business</h1><p className="mt-0.5 text-xs text-muted-foreground">{data.period}</p></div>
      <Button variant="outline" className="h-11 shrink-0 gap-2 px-3 text-xs" disabled={refreshing} onClick={onRefresh} aria-label="Refresh dashboard"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`}/>{refreshing ? "Updating…" : "Refresh"}</Button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">{error}</p>}
    {overview && metrics.length > 0 && <div className="grid grid-cols-2 gap-2" aria-label="Business summary">{metrics.map(({ label, value, Icon, target }) => <button key={label} type="button" onClick={() => setSection(target)} className="mobile-dashboard-metric min-w-0 rounded-xl border bg-card p-3 text-left"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary"/>{label}</span><strong className="mt-1.5 block text-2xl font-semibold leading-none tabular-nums">{count(value)}</strong></button>)}</div>}
    <nav aria-label="Dashboard sections" className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1">{sections.map(item => <button key={item.id} type="button" aria-current={current === item.id ? "page" : undefined} onClick={() => setSection(item.id)} className={`min-h-11 shrink-0 flex-1 rounded-lg px-2 text-xs font-medium ${current === item.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>{item.label}</button>)}</nav>
    {overview && (access.inventory || access.sales || access.listings) && <section aria-label="Quick actions" className="flex flex-wrap gap-2">
      {access.inventory && <Link href="/inventory" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs"><Gem className="h-3.5 w-3.5 text-primary"/>Inventory<ArrowUpRight className="h-3 w-3"/></Link>}
      {access.sales && <Link href="/invoices" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs"><Files className="h-3.5 w-3.5 text-primary"/>Invoices<ArrowUpRight className="h-3 w-3"/></Link>}
      {access.listings && <Link href="/marketplace-control-center" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs"><Store className="h-3.5 w-3.5 text-primary"/>Channels<ArrowUpRight className="h-3 w-3"/></Link>}
    </section>}
    {overview && ((inventory?.preparedUnlisted || 0) > 0 || (invoices?.unpaid || 0) > 0 || syncErrors > 0) && <section className="rounded-xl border bg-card px-3" aria-label="Needs attention">
      <h2 className="pt-3 text-xs font-semibold">Needs attention</h2>
      {access.inventory && access.listings && !!inventory?.preparedUnlisted && <Action href="/inventory?filter=preparedUnlisted" label="Gemstones ready to list" value={count(inventory.preparedUnlisted)}/>}
      {access.sales && !!invoices?.unpaid && <Action href="/invoices" label="Unpaid invoices this month" value={count(invoices.unpaid)}/>}
      {access.listings && syncErrors > 0 && <Action href="/marketplace-control-center" label="Channel sync errors" value={count(syncErrors)}/>}
    </section>}
    {current === "stock" && access.inventory && <section className="rounded-xl border bg-card p-3" aria-label="Gemstone stock">
      <SectionHeading title="Gemstone stock" href="/inventory"/>
      {!inventory ? <Unavailable label="Inventory"/> : <>
        <p className="mb-3 text-xs text-muted-foreground">{count(inventory.total)} unique SKUs in stock</p>
        <div className="divide-y">{inventory.gemstones.map(gem => <div key={gem.name} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><Gem className="h-4 w-4 shrink-0 text-primary"/><span className="break-words">{gem.name}</span></span><strong className="tabular-nums">{count(gem.count)}</strong></div>)}</div>
        {!inventory.total && <p className="py-3 text-xs text-muted-foreground">No gemstones currently in stock.</p>}
        {inventory.listed !== null && <div className="mt-3 border-t pt-3 text-xs"><p className="flex justify-between gap-2"><span>Marketplace coverage</span><strong>{count(inventory.listed)} / {count(inventory.total)}</strong></p><div className="my-2 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${inventory.listed} stock items listed`}><span className="block h-full bg-primary" style={{ width: `${inventory.total ? Math.min(100, inventory.listed / inventory.total * 100) : 0}%` }}/></div><Action href="/inventory?filter=unlisted" label="Unlisted stock" value={count(inventory.unlisted)}/></div>}
        {access.listings && inventory.preparedUnlisted !== null && <><Action href="/inventory?filter=preparedUnlisted" label="Prepared & unlisted" value={count(inventory.preparedUnlisted)}/><p className="text-[11px] text-muted-foreground">Photo, description and price present. Final channel checks happen during listing preparation.</p></>}
      </>}
    </section>}
    {(overview || current === "channels") && access.listings && <section className="rounded-xl border bg-card p-3" aria-label="Marketplace channels">
      <SectionHeading title="Channels" href="/marketplace-control-center"/>
      {!marketplace ? <Unavailable label="Marketplace"/> : !shops.length ? <p className="py-3 text-xs text-muted-foreground">No shops configured. <Link href="/marketplace-control-center" className="text-primary underline">Connect a shop</Link>.</p> : <div className="divide-y">{shops.map(shop => <div key={shop.id} className="py-3 first:pt-1 last:pb-0">
        <div className="flex items-center gap-2"><span className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md bg-white"><MarketplaceLogo platform={shop.platform} className="h-5 w-12"/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" title={shop.name}>{shop.name}</p><p className={`mt-0.5 text-[10px] ${shop.connected ? "text-[var(--gem-emerald)]" : "text-[var(--gem-gold)]"}`}>{shop.connected ? "Connected" : "Reconnect required"}</p></div><Link href={`/marketplace-listings?marketplace=${shop.platform}&shop=${encodeURIComponent(shop.id)}`} className="min-w-12 py-2 text-right"><strong className="block text-lg leading-none tabular-nums">{count(shop.active)}</strong><span className="text-[10px] text-muted-foreground">listings</span></Link></div>
        {!overview && <div className="mt-2 space-y-1"><Action href="/marketplace-drafts" label="Drafts" value={count(shop.drafts)}/><Action href="/marketplace-control-center" label="Sync errors" value={count(shop.errors)}/><p className="text-[10px] text-muted-foreground">{shop.lastSyncedAt ? `Synced ${timestamp(shop.lastSyncedAt)}` : "Not synced yet"}</p></div>}
      </div>)}</div>}
      {!overview && <p className="mt-3 text-[11px] text-muted-foreground">Counts reflect the last ERP sync. A gemstone may be listed on both channels.</p>}
    </section>}
    {(overview || current === "invoices") && access.sales && <section className="rounded-xl border bg-card p-3" aria-label="Recent invoices">
      <SectionHeading title="Recent invoices" href="/invoices"/>
      {!invoices ? <Unavailable label="Invoice"/> : <>
        {!overview && <><div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-muted p-2 text-center">{[["Export", invoices.export], ["Tax", invoices.tax], ["Unpaid", invoices.unpaid]].map(([label, value]) => <div key={label}><strong className="block text-lg tabular-nums">{count(Number(value))}</strong><span className="text-[10px] text-muted-foreground">{label}</span></div>)}</div><div className="mb-2 flex gap-2" aria-label="Mobile invoice type">{["all", "EXPORT", "TAX"].map(type => <button key={type} type="button" onClick={() => setInvoiceType(type)} aria-pressed={invoiceType === type} className={`min-h-11 rounded-lg border px-3 text-xs ${invoiceType === type ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>{type === "all" ? "All dates" : type === "EXPORT" ? "Export" : "Tax"}</button>)}</div></>}
        <div className="divide-y">{recentInvoices.map(invoice => <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex min-h-16 items-center justify-between gap-3 py-2"><div className="min-w-0 flex-1"><p className="text-xs font-medium">{invoice.number}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{invoice.customer}</p></div><div className="max-w-[55%] text-right"><p className="break-words text-xs font-semibold tabular-nums">{amount(invoice.amount, invoice.currency)}</p><p className={`mt-1 text-[10px] ${invoice.paymentStatus === "PAID" ? "text-[var(--gem-emerald)]" : "text-[var(--gem-gold)]"}`}>{permissionLabel(invoice.paymentStatus)}</p></div></Link>)}</div>
        {!recentInvoices.length && <p className="py-3 text-xs text-muted-foreground">No recent {invoiceType === "all" || overview ? "" : invoiceType.toLowerCase()} invoices.</p>}
      </>}
    </section>}
    {overview && access.customers && customers && <Link href="/customers" className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-3"><Users className="h-4 w-4 text-primary"/><div className="flex-1"><h2 className="text-xs font-semibold">Customers this month</h2><p className="mt-1 text-[11px] text-muted-foreground">{count(customers.new)} new · {count(customers.returningBuyers)} returning buyers</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></Link>}
    {(overview || current === "activity") && access.activity && <section className="rounded-xl border bg-card p-3" aria-label="Recent activity">
      <SectionHeading title={access.teamActivity ? "Team activity" : "Your activity"} href="/activity-log"/>
      {!overview && access.teamActivity && actors.length > 1 && <select aria-label="Mobile activity user" value={effectiveActor} onChange={event => setActorId(event.target.value)} className="mb-2 min-h-11 w-full rounded-lg border bg-card px-2 text-xs"><option value="all">All users</option>{actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>}
      <div className="divide-y">{activity.map(log => <button key={log.id} type="button" onClick={() => onActivity(log)} className="flex min-h-16 w-full items-start gap-2 py-3 text-left"><History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"/><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{log.actor}</span><span className="mt-1 block break-words text-[11px] text-muted-foreground">{permissionLabel(log.action)} · {log.entity}{log.reference ? ` · ${log.reference}` : ""}</span><time dateTime={log.createdAt} className="mt-1 block text-[10px] text-muted-foreground">{timestamp(log.createdAt)}</time></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground"/></button>)}</div>
      {!activity.length && <p className="py-3 text-xs text-muted-foreground">{data.unavailable.includes("activity") ? "Activity is temporarily unavailable." : "No recent activity."}</p>}
    </section>}
    {!metrics.length && !access.activity && !access.customers && <p className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">Your dashboard will show the modules your role can access.</p>}
    <p className="text-[10px] text-muted-foreground">Updated {timestamp(data.updatedAt)} · Auto-refreshes every 2 minutes.</p>
  </div>;
}

function SectionHeading({ title, href }: { title: string; href: string }) {
  return <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{title}</h2><Link href={href} className="inline-flex min-h-11 items-center gap-1 text-xs text-primary">View all<ArrowUpRight className="h-3 w-3"/></Link></div>;
}
function Action({ href, label, value }: { href: string; label: string; value: string }) {
  return <Link href={href} className="flex min-h-11 items-center justify-between gap-2 py-2 text-xs"><span>{label}</span><span className="flex shrink-0 items-center gap-2 font-semibold tabular-nums">{value}<ChevronRight className="h-3 w-3 text-muted-foreground"/></span></Link>;
}
function Unavailable({ label }: { label: string }) { return <p className="py-3 text-xs text-muted-foreground">{label} data is temporarily unavailable.</p>; }
