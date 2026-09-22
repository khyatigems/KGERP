"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Gem, ArrowUpRight, Link2, FileText, CheckCircle2,
  TrendingUp, Layers, Package
} from "lucide-react";
import { MatchedPairModal } from "./matched-pair-modal";
import { MatchedPairItem, MatchedPairsResponse, MatchedPairTab } from "./matched-pairs-types";
import { formatCurrency, cn } from "@/lib/utils";
import Image from "next/image";

const fetcher = (url: string) => fetch(url).then(res => res.json());

function getMatchQuality(score: number): "excellent" | "good" | "possible" {
  if (score >= 130) return "excellent";
  if (score >= 110) return "good";
  return "possible";
}

const qualityConfig = {
  excellent: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500",
    lightBg: "bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Excellent",
  },
  good: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500",
    lightBg: "bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-800",
    label: "Good",
  },
  possible: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500",
    lightBg: "bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-800",
    label: "Possible",
  },
};

function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const quality = getMatchQuality(score);
  const config = qualityConfig[quality];
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / 160, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={3}
          className="text-border/50" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset}
          className={config.bg} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {score}
      </span>
    </div>
  );
}

function GemThumbnail({ src, alt, overlapping = false, offset = false }: { src?: string | null; alt: string; overlapping?: boolean; offset?: boolean }) {
  return (
    <div
      className={cn(
        "relative h-8 w-8 rounded-full border-2 border-card overflow-hidden bg-muted shrink-0",
        overlapping && offset && "-ml-3"
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="32px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-amber-500/10">
          <Gem className="h-4 w-4 text-primary/50" />
        </div>
      )}
    </div>
  );
}

export function MatchedPairsWidget({ size = "default" }: { size?: string }) {
  const [activeTab, setActiveTab] = useState<MatchedPairTab>("ALL");
  const [selectedItem, setSelectedItem] = useState<MatchedPairItem | null>(null);

  const params = new URLSearchParams();
  params.set("matchType", activeTab);
  params.set("limit", size === "full" ? "10" : size === "wide" ? "8" : "5");

  const { data, error, isLoading, mutate } = useSWR<MatchedPairsResponse>(
    `/api/inventory/matched-pairs?${params.toString()}`,
    fetcher,
    { refreshInterval: 120000, revalidateOnFocus: true }
  );

  const handleConfirm = async (item: MatchedPairItem) => {
    try {
      await fetch("/api/inventory/pairs/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: item.id, suggestedPrice: item.suggestedPrice }),
      });
      mutate();
    } catch {}
  };

  const handleReject = async (item: MatchedPairItem) => {
    try {
      await fetch("/api/inventory/pairs/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: item.id }),
      });
      mutate();
    } catch {}
  };

  const handleCreateQuotation = (item: MatchedPairItem) => {
    const skuList = item.items.map(i => i.sku).join(",");
    window.open(`/quotes/new?skus=${encodeURIComponent(skuList)}`, "_blank");
  };

  const handleListTogether = (item: MatchedPairItem) => {
    const skuList = item.items.map(i => i.sku).join(",");
    window.open(`/listings/new?paired=${encodeURIComponent(skuList)}`, "_blank");
  };

  const results = data?.results || [];
  const summary = data?.summary;
  const totalValue = data?.totalValue || 0;
  const viewAllUrl = `/inventory/matched-pairs?${new URLSearchParams({ matchType: activeTab }).toString()}`;

  const isCompact = size === "default";
  const isWide = size === "wide";
  const displayCount = isCompact ? 3 : isWide ? 4 : 6;

  if (error) {
    return (
      <Card className="sass-enter">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Matched Pairs & Sets
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-red-500 text-xs">Failed to load.</p></CardContent>
      </Card>
    );
  }

  if (isLoading && !data) {
    return (
      <Card className="sass-enter">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Matched Pairs & Sets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-muted/50 rounded-xl" />)}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse bg-muted/50 rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sass-enter">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Matched Pairs & Sets
            </CardTitle>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MatchedPairTab)}>
            <TabsList className="bg-muted p-0.5 rounded-md h-auto">
              <TabsTrigger value="ALL" className="text-[10px] px-2 py-0.5 h-auto">All</TabsTrigger>
              <TabsTrigger value="PAIR" className="text-[10px] px-2 py-0.5 h-auto">Pairs</TabsTrigger>
              <TabsTrigger value="SET_3" className="text-[10px] px-2 py-0.5 h-auto">3+</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* ── KPI Stats Strip ── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-br from-primary/8 to-primary/2 border border-primary/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{summary.totalPairs + summary.totalSets}</p>
                <p className="text-[10px] text-muted-foreground">Total Matches</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/8 to-emerald-500/2 border border-emerald-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                <Gem className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{summary.totalPairs}</p>
                <p className="text-[10px] text-muted-foreground">Pairs</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-br from-blue-500/8 to-blue-500/2 border border-blue-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{summary.totalSets}</p>
                <p className="text-[10px] text-muted-foreground">Sets</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-br from-amber-500/8 to-amber-500/2 border border-amber-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{formatCurrency(totalValue)}</p>
                <p className="text-[10px] text-muted-foreground">Potential Value</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Quality Distribution Bar ── */}
        {summary && (summary.excellentPairs + summary.goodPairs + summary.possibleMatches) > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted/50">
              {summary.excellentPairs > 0 && (
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(summary.excellentPairs / (summary.excellentPairs + summary.goodPairs + summary.possibleMatches)) * 100}%` }}
                />
              )}
              {summary.goodPairs > 0 && (
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(summary.goodPairs / (summary.excellentPairs + summary.goodPairs + summary.possibleMatches)) * 100}%` }}
                />
              )}
              {summary.possibleMatches > 0 && (
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${(summary.possibleMatches / (summary.excellentPairs + summary.goodPairs + summary.possibleMatches)) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {summary.excellentPairs} Excellent
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {summary.goodPairs} Good
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {summary.possibleMatches} Possible
              </span>
            </div>
          </div>
        )}

        {/* ── Match Cards ── */}
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No matches found</p>
            <p className="text-xs mt-1">Add more inventory to discover matched pairs</p>
          </div>
        ) : isCompact ? (
          /* ── DEFAULT: Compact visual cards ── */
          <div className="space-y-2">
            {results.slice(0, displayCount).map((item) => {
              const quality = getMatchQuality(item.score);
              const config = qualityConfig[quality];
              const typeLabel = item.matchType === "PAIR" ? "Pair" : item.matchType === "SET_3" ? "Set of 3" : "Set of 4";
              const skus = item.items.map(i => i.sku).join(" + ");
              const specs = item.items.map(i =>
                [i.gemType, i.color, i.carats ? `${i.carats}ct` : null].filter(Boolean).join(" ")
              ).join(" · ");

              return (
                <div
                  key={item.id}
                  className="group relative flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/30 cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Gem Thumbnails */}
                  <div className="flex items-center shrink-0">
                    {item.items.slice(0, 2).map((gem, i) => (
                      <GemThumbnail
                        key={gem.id}
                        src={gem.imageUrl}
                        alt={gem.sku}
                        overlapping={i === 1}
                        offset={i === 1}
                      />
                    ))}
                    {item.items.length > 2 && (
                      <span className="ml-1 text-[10px] text-muted-foreground font-medium">
                        +{item.items.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium", config.border, config.color)}>
                        {typeLabel}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">{skus}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{specs}</p>
                  </div>

                  {/* Score + Value */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <ScoreRing score={item.score} size={34} />
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary">{formatCurrency(item.suggestedPrice)}</p>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); handleCreateQuotation(item); }} title="Create Quotation">
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); handleListTogether(item); }} title="List Together">
                      <Link2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); handleConfirm(item); }} title="Confirm">
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── WIDE / FULL: Expanded cards with more detail ── */
          <div className={cn("grid gap-2", isWide ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3")}>
            {results.slice(0, displayCount).map((item) => {
              const quality = getMatchQuality(item.score);
              const config = qualityConfig[quality];
              const typeLabel = item.matchType === "PAIR" ? "Pair" : item.matchType === "SET_3" ? "Set of 3" : "Set of 4";

              return (
                <div
                  key={item.id}
                  className="group relative p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/30 cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* Gem Avatars */}
                    <div className="flex items-center">
                      {item.items.slice(0, 3).map((gem, i) => (
                        <GemThumbnail
                          key={gem.id}
                          src={gem.imageUrl}
                          alt={gem.sku}
                          overlapping={i > 0}
                          offset={i > 0}
                        />
                      ))}
                      {item.items.length > 3 && (
                        <span className="ml-1 text-[10px] text-muted-foreground font-medium">
                          +{item.items.length - 3}
                        </span>
                      )}
                    </div>
                    <ScoreRing score={item.score} size={32} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium", config.border, config.color)}>
                        {typeLabel}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-1">
                      {item.items.map(i => i.sku).join(" + ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.items.map(i =>
                        [i.gemType, i.color, i.carats ? `${i.carats}ct` : null].filter(Boolean).join(" ")
                      ).join(" · ")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
                    <span className="text-xs font-semibold text-primary">{formatCurrency(item.suggestedPrice)}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); handleCreateQuotation(item); }} title="Create Quotation">
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); handleListTogether(item); }} title="List Together">
                        <Link2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5"
                        onClick={(e) => { e.stopPropagation(); handleConfirm(item); }} title="Confirm">
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── View All Link ── */}
        {data && data.total > displayCount && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={() => window.open(viewAllUrl, "_blank")}
          >
            View all {data.total} matches
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
        )}

        <MatchedPairModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onCreateQuotation={handleCreateQuotation}
          onListTogether={handleListTogether}
        />
      </CardContent>
    </Card>
  );
}
