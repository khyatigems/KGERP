"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Lock, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reportPresentation } from "@/lib/report-presentation";
import { REPORT_CATALOG } from "@/lib/report-catalog";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export function ReportDirectory({ financial, vendor, admin, overview = false }: { financial: boolean; vendor: boolean; admin: boolean; overview?: boolean }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All reports");
  const groups = ["All reports", ...new Set(REPORT_CATALOG.map(r => r.group))];
  const visible = REPORT_CATALOG.filter(r => (group === "All reports" || group === r.group) && `${r.title} ${r.description} ${r.group}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6">
    <WorkspaceHeader eyebrow="KhyatiGems · Insights"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Find the right report for your workflow. Data loads when you open a report.</p></div><Button asChild variant="outline"><Link href={overview ? "/reports" : "/reports?view=overview"}><BarChart3 className="mr-2 h-4 w-4"/>{overview ? "Report library" : "Open overview"}</Link></Button></div></WorkspaceHeader>
    <div className="rounded-2xl border bg-card p-4 space-y-4"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" aria-label="Search reports" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reports, tasks, or modules..."/></div><div className="flex flex-wrap gap-2">{groups.map(g => <Button key={g} size="sm" variant={g === group ? "default" : "outline"} aria-pressed={g === group} onClick={() => setGroup(g)}>{g}</Button>)}</div></div>
    <p className="text-xs text-muted-foreground">{visible.length} reports · Access follows your assigned role</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(r => {
      const allowed = (!r.financial || financial) && (!r.vendor || vendor) && (!r.adminOnly || admin);
      const { Icon, color } = reportPresentation(r.href, r.group);
      const card = <><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${color}`}><Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true"/></span><Badge variant="secondary">{r.group}</Badge></div>{allowed ? <ArrowUpRight className="h-4 w-4 text-primary"/> : <Lock className="h-4 w-4 text-muted-foreground"/>}</div><h2 className="mt-4 font-semibold">{r.title}</h2><p className="mt-2 text-sm text-muted-foreground">{r.description}</p><p className="mt-5 text-xs font-medium text-primary">{allowed ? "Open report" : "Requires additional access"}</p></>;
      return allowed ? <Link key={r.href} href={r.href} className="rounded-2xl border bg-card p-5 shadow-sm motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">{card}</Link> : <div key={r.href} aria-disabled="true" className="rounded-2xl border bg-muted/30 p-5 opacity-70">{card}</div>;
    })}</div>
    {!visible.length && <p className="py-8 text-center text-muted-foreground">No reports match. Try another search or category.</p>}
  </div>;
}
