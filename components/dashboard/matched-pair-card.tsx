"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle2, XCircle, Eye, FileText, Link2, Sparkles, Gem } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { MatchedPairItem } from "./matched-pairs-types";

interface MatchedPairCardProps {
  item: MatchedPairItem;
  index: number;
  onConfirm: (item: MatchedPairItem) => void;
  onReject: (item: MatchedPairItem) => void;
  onCreateQuotation: (item: MatchedPairItem) => void;
  onListTogether: (item: MatchedPairItem) => void;
  onViewDetails: () => void;
}

function getMatchQuality(score: number): "excellent" | "good" | "possible" {
  if (score >= 130) return "excellent";
  if (score >= 110) return "good";
  return "possible";
}

function getQualityColor(quality: "excellent" | "good" | "possible"): string {
  switch (quality) {
    case "excellent": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "good": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "possible": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }
}

function getQualityLabel(quality: "excellent" | "good" | "possible"): string {
  switch (quality) {
    case "excellent": return "Excellent";
    case "good": return "Good";
    case "possible": return "Possible";
  }
}

export function MatchedPairCard({
  item,
  index,
  onConfirm,
  onReject,
  onCreateQuotation,
  onListTogether,
  onViewDetails,
}: MatchedPairCardProps) {
  const quality = getMatchQuality(item.score);

  return (
    <Card
      className={cn(
        "sass-enter overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20",
        "gem-stagger-in",
        { "border-emerald-200 dark:border-emerald-800": quality === "excellent" }
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold px-2 py-1 shrink-0",
                quality === "excellent" && "border-emerald-300 text-emerald-700 bg-emerald-50",
                quality === "good" && "border-blue-300 text-blue-700 bg-blue-50",
                quality === "possible" && "border-amber-300 text-amber-700 bg-amber-50"
              )}
            >
              <span className="flex items-center gap-1">
                {item.matchType === "PAIR" ? (
                  <span className="flex items-center gap-1">
                    <Gem className="h-3 w-3" />
                    Pair
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Set of {item.matchType === "SET_3" ? 3 : 4}
                  </span>
                )}
              </span>
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.items.map(i => i.sku).join(" + ")}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.items.map(i => i.itemName).join(" + ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              getQualityColor(getMatchQuality(item.score))
            )}>
              {getQualityLabel(getMatchQuality(item.score))}
            </span>
            <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
              Score: {item.score}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onViewDetails}>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onConfirm(item)}>
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                  Confirm Match
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onCreateQuotation(item)}>
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  Create Quotation
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onListTogether(item)}>
                  <Link2 className="mr-2 h-3.5 w-3.5" />
                  List Together
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onReject(item)}
                  className="text-red-600 focus:text-red-600"
                >
                  <XCircle className="mr-2 h-3.5 w-3.5" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {item.items.map((itemData) => (
            <div key={itemData.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                {itemData.imageUrl ? (
                  <Image
                    src={itemData.imageUrl}
                    alt={itemData.sku}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-amber/10">
                    <Gem className="h-6 w-6 text-primary/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium truncate">{itemData.sku}</p>
                <p className="text-[10px] text-muted-foreground truncate">{itemData.itemName}</p>
                <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-muted-foreground">
                  {itemData.gemType && <span>{itemData.gemType}</span>}
                  {itemData.color && <span>{itemData.color}</span>}
                  {itemData.shape && <span>{itemData.shape}</span>}
                  <span>{itemData.carats.toFixed(2)}ct</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Total Value:</span>
            <span className="font-bold text-lg">{formatCurrency(item.totalValue)}</span>
            <span className="text-muted-foreground">Suggested:</span>
            <span className="font-bold text-primary text-lg">{formatCurrency(item.suggestedPrice)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onCreateQuotation(item)} className="gap-1">
              <FileText className="h-3.5 w-3.5" />
              Quotation
            </Button>
            <Button variant="outline" size="sm" onClick={() => onListTogether(item)} className="gap-1">
              <Link2 className="h-3.5 w-3.5" />
              List
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onConfirm(item)} className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm
            </Button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t text-[10px] text-muted-foreground">
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
              {item.matchDetails.gemType ? "✓" : "✗"} Gem Type
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
              {item.matchDetails.color ? "✓" : "✗"} Color
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
              {item.matchDetails.shape ? "✓" : "✗"} Shape
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
              {item.matchDetails.carats?.withinTolerance ? "✓" : "✗"} Carat ({item.matchDetails.carats?.diff?.toFixed(2) || 0}ct)
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
              Clarity: {item.matchDetails.clarity}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
              Cut: {item.matchDetails.cut}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}