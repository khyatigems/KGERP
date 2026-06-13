"use client";

import { useMemo } from "react";
import {
  FileText, AlertTriangle, Clock, Package,
  Link2, Printer, ArrowRight, CheckCircle2, Zap,
  DollarSign, ShoppingCart, PlusCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AttentionData {
  quotations?: Array<{ id: string }>;
  invoices?: Array<{ id: string }>;
  memo?: Array<{ id: string }>;
  vendors?: number;
  pendingExpenses?: Array<{ id: string }>;
}

interface WorkQueueProps {
  attention?: AttentionData;
  todayActions?: {
    inventory: number;
    quotations: number;
    labels: number;
    invoices: number;
  };
  pendingPayments?: { count: number };
  todayOrders?: number;
}

type WorkItem = {
  id: string;
  icon: typeof FileText;
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
  href: string;
};

export function WorkQueue({ attention, todayActions, pendingPayments, todayOrders }: WorkQueueProps) {
  const items: WorkItem[] = useMemo(() => {
    const result: WorkItem[] = [];

    const addIfPresent = (id: string, icon: typeof FileText, label: string, count: number, severity: WorkItem["severity"], href: string) => {
      if (count > 0) result.push({ id, icon, label, count, severity, href });
    };

    // Financial actions (critical/warning)
    addIfPresent("overdue-invoices", AlertTriangle, "Overdue Invoices", attention?.invoices?.length ?? 0, "critical", "/invoices");
    addIfPresent("expiring-quotations", FileText, "Expiring Quotations", attention?.quotations?.length ?? 0, "warning", "/quotes");
    addIfPresent("overdue-memo", Clock, "Overdue Memo / Returns", attention?.memo?.length ?? 0, "warning", "/sales-returns");
    addIfPresent("pending-vendors", Package, "Pending Vendor Approvals", attention?.vendors ?? 0, "warning", "/vendors");
    addIfPresent("pending-payments", DollarSign, "Pending Payments", pendingPayments?.count ?? 0, "warning", "/invoices");
    addIfPresent("pending-expenses", Link2, "Pending Expenses", attention?.pendingExpenses?.length ?? 0, "info", "/expenses");

    // Today's activity (info)
    addIfPresent("today-inventory", PlusCircle, "Items Added Today", todayActions?.inventory ?? 0, "info", "/inventory");
    addIfPresent("today-quotations", FileText, "Quotations Created Today", todayActions?.quotations ?? 0, "info", "/quotes");
    addIfPresent("today-invoices", ShoppingCart, "Invoices Created Today", todayActions?.invoices ?? 0, "info", "/invoices");
    addIfPresent("today-sales", DollarSign, "Orders Today", todayOrders ?? 0, "info", "/sales");
    addIfPresent("labels", Printer, "Generate Labels", todayActions?.labels ?? 0, "info", "/labels");

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    result.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

    return result;
  }, [attention, todayActions, pendingPayments, todayOrders]);

  const severityConfig = {
    critical: { badge: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20" },
    warning: { badge: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20" },
    info: { badge: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20" },
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 gem-fade-in gem-shimmer-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Today&apos;s Work Queue</h2>
            <p className="text-xs text-muted-foreground">{items.length} actionable task{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary/10 px-2 text-[11px] font-semibold text-primary">
            {items.reduce((s, i) => s + i.count, 0)}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground mt-1">No tasks need attention right now</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const config = severityConfig[item.severity];
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg p-2.5 transition-all duration-150 hover:bg-muted/50"
              >
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", config.badge)}>
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {item.label}
                </span>
                <span className={cn(
                  "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold shrink-0",
                  config.badge
                )}>
                  {item.count}
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
