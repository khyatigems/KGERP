"use client";

import useSWR from "swr";
import Link from "next/link";
import { ArrowUpRight, Gem, Package, Sparkles, TrendingUp } from "lucide-react";
import type { MatchedPairsResponse } from "./matched-pairs-types";
import { formatCurrency } from "@/lib/utils";

const fetcher = async (url: string): Promise<MatchedPairsResponse> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch matched pairs");
  return response.json();
};

export function MatchedPairsSummaryWidget() {
  const { data, error, isLoading } = useSWR<MatchedPairsResponse>(
    "/api/inventory/matched-pairs?matchType=ALL&limit=1",
    fetcher,
    { refreshInterval: 120000, revalidateOnFocus: true },
  );
  const totalMatches = (data?.summary?.totalPairs ?? 0) + (data?.summary?.totalSets ?? 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Matches", value: totalMatches, icon: Sparkles, color: "text-primary" },
          { label: "Pairs", value: data?.summary?.totalPairs ?? 0, icon: Gem, color: "text-emerald-500" },
          { label: "Sets", value: data?.summary?.totalSets ?? 0, icon: Package, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/25 px-2.5 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className="text-[10px]">{label}</span>
            </div>
            <p className="text-lg font-semibold leading-none tabular-nums">
              {isLoading && !data ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-muted" /> : value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-amber-500/4 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground">Potential bundle value</p>
            <p className="truncate text-sm font-semibold">
              {isLoading && !data ? "Loading..." : formatCurrency(data?.totalValue ?? 0)}
            </p>
          </div>
        </div>
        <Link
          href="/inventory/matched-pairs"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          Explore <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {error && <p className="text-xs text-destructive">Could not load match suggestions.</p>}
      {!error && data && totalMatches === 0 && (
        <p className="text-xs text-muted-foreground">No current matches. Add similar inventory to find bundle opportunities.</p>
      )}
      {!error && !data && !isLoading && (
        <p className="text-xs text-muted-foreground">Match data is not available right now.</p>
      )}
    </div>
  );
}
