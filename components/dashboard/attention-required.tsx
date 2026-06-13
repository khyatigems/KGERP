"use client";

import { useMemo } from "react";
import { AlertTriangle, Clock, FileText, ShieldAlert, ImageIcon, Package, Globe, BadgeAlert, Link2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AttentionData {
  quotations: Array<{ id: string }>;
  invoices: Array<{ id: string }>;
  memo: Array<{ id: string }>;
  vendors: number;
  unsold?: Array<{ id: string; sku: string }>;
  missingCertifications?: Array<{ id: string; sku: string }>;
  missingImages?: Array<{ id: string; sku: string }>;
  highValueUnsold?: Array<{ id: string; sku: string }>;
  pendingExpenses?: Array<{ id: string }>;
}

interface AttentionRequiredProps {
  data: AttentionData;
}

type AttentionItem = {
  id: string;
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  count: number;
  severity: "critical" | "warning" | "info" | "success";
  href: string;
};

export function AttentionRequired({ data }: AttentionRequiredProps) {
  const items: AttentionItem[] = useMemo(() => {
    const result: AttentionItem[] = [];

    const missingImages = data.missingImages?.length ?? 0;
    if (missingImages > 0) {
      result.push({
        id: "missing-images",
        icon: ImageIcon,
        title: "Listings Missing Images",
        description: "Products without product images",
        count: missingImages,
        severity: "critical",
        href: "/inventory?filter=missingImages",
      });
    }

    const missingCerts = data.missingCertifications?.length ?? 0;
    if (missingCerts > 0) {
      result.push({
        id: "missing-certs",
        icon: ShieldAlert,
        title: "Certificate Missing",
        description: "Products without certification",
        count: missingCerts,
        severity: "warning",
        href: "/inventory?filter=missingCertification",
      });
    }

    const quotations = data.quotations?.length ?? 0;
    if (quotations > 0) {
      result.push({
        id: "quotations",
        icon: FileText,
        title: "Quotations Expiring",
        description: "Quotations nearing expiry",
        count: quotations,
        severity: "warning",
        href: "/quotes",
      });
    }

    const invoices = data.invoices?.length ?? 0;
    if (invoices > 0) {
      result.push({
        id: "invoices",
        icon: AlertTriangle,
        title: "Overdue Invoices",
        description: "Invoices past due date",
        count: invoices,
        severity: "critical",
        href: "/invoices",
      });
    }

    const memo = data.memo?.length ?? 0;
    if (memo > 0) {
      result.push({
        id: "memo",
        icon: Clock,
        title: "Overdue Memo Items",
        description: "Memo items past return date",
        count: memo,
        severity: "warning",
        href: "/sales-returns",
      });
    }

    const vendors = data.vendors ?? 0;
    if (vendors > 0) {
      result.push({
        id: "vendors",
        icon: Package,
        title: "Pending Vendors",
        description: "Vendors awaiting approval",
        count: vendors,
        severity: "info",
        href: "/vendors",
      });
    }

    const unsold = data.unsold?.length ?? 0;
    if (unsold > 0) {
      result.push({
        id: "unsold",
        icon: BadgeAlert,
        title: "Stagnant Stock",
        description: "Items with no recent activity",
        count: unsold,
        severity: "info",
        href: "/inventory?filter=stagnant",
      });
    }

    const highValue = data.highValueUnsold?.length ?? 0;
    if (highValue > 0) {
      result.push({
        id: "high-value",
        icon: Globe,
        title: "High-Value Stagnant Items",
        description: "Valuable items not sold",
        count: highValue,
        severity: "critical",
        href: "/inventory?filter=highValueUnsold",
      });
    }

    const expenses = data.pendingExpenses?.length ?? 0;
    if (expenses > 0) {
      result.push({
        id: "expenses",
        icon: Link2,
        title: "Pending Expenses",
        description: "Expenses awaiting payment",
        count: expenses,
        severity: "info",
        href: "/expenses",
      });
    }

    result.push({
      id: "sync-issues",
      icon: RefreshCw,
      title: "Marketplace Sync Status",
      description: "Check sync health for all platforms",
      count: 0,
      severity: "info",
      href: "/marketplace-control-center",
    });

    return result;
  }, [data]);

  const severityConfig = {
    critical: {
      dot: "bg-red-500",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
      hover: "hover:bg-red-500/5",
    },
    warning: {
      dot: "bg-orange-500",
      badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      hover: "hover:bg-orange-500/5",
    },
    info: {
      dot: "bg-blue-500",
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      hover: "hover:bg-blue-500/5",
    },
    success: {
      dot: "bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      hover: "hover:bg-emerald-500/5",
    },
  };

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F8FAFC]">Attention Required</h2>
            <p className="text-xs text-[#94A3B8]">Items needing your immediate action</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex h-7 items-center rounded-full bg-amber-500/10 px-3 text-xs font-medium text-amber-400">
            {items.reduce((s, i) => s + i.count, 0)} issues
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <AlertTriangle className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-[#F8FAFC]">Everything looks good</p>
          <p className="text-xs text-[#94A3B8] mt-1">No items require your attention right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((item) => {
            const config = severityConfig[item.severity];
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border border-[#1E293B] p-3 transition-all duration-150",
                  config.hover,
                  "hover:border-[#334155]"
                )}
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", config.badge)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#F8FAFC] truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className={cn("flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold shrink-0", config.badge)}>
                      {item.count || "!"}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
