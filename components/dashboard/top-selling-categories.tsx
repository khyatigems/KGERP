"use client";

import { FolderOpen, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CategoryData {
  name: string;
  count: number;
  value: number;
}

interface TopSellingCategoriesProps {
  data?: CategoryData[];
}

export function TopSellingCategories({ data }: TopSellingCategoriesProps) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full sass-enter ">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Top categories</h2>
            <p className="text-xs text-muted-foreground">Best selling product categories</p>
          </div>
        </div>
        <Link
          href="/reports"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Reports <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {data.map((item, i) => {
          const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const colorVar = i === 0 ? "var(--primary)" : "var(--muted-foreground)";
          return (
            <div key={item.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-4 text-right">{i + 1}</span>
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{item.count} sold</span>
                  <span className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden ml-6">
                <div
                  className={cn("h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-500")}
                  style={{ width: `${pct}%`, backgroundColor: colorVar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
