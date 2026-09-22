"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, CheckCircle2, XCircle, FileText, Link2, Gem, Sparkles } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { MatchedPairItem } from "./matched-pairs-types";

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
    case "excellent": return "Excellent Match";
    case "good": return "Good Match";
    case "possible": return "Possible Match";
  }
}

interface MatchedPairModalProps {
  item: MatchedPairItem | null;
  onClose: () => void;
  onConfirm: (item: MatchedPairItem) => void;
  onReject: (item: MatchedPairItem) => void;
  onCreateQuotation: (item: MatchedPairItem) => void;
  onListTogether: (item: MatchedPairItem) => void;
}

export function MatchedPairModal({
  item,
  onClose,
  onConfirm,
  onReject,
  onCreateQuotation,
  onListTogether,
}: MatchedPairModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-xl border shadow-xl animate-content-show">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-sm font-medium px-3 py-1",
                getQualityColor(getMatchQuality(item.score))
              )}
            >
              <span className="flex items-center gap-1">
                {item.matchType === "PAIR" ? (
                  <Gem className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {item.matchType === "PAIR" ? "Pair" : `Set of ${item.matchType === "SET_3" ? 3 : 4}`}
              </span>
            </Badge>
            <Badge
              className={cn("text-sm px-2 py-1", getQualityColor(getMatchQuality(item.score)))}
            >
              Score: {item.score} · {getQualityLabel(getMatchQuality(item.score))}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {item.items.map((itemData) => (
                <div key={itemData.id} className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                    {itemData.imageUrl ? (
                      <Image
                        src={itemData.imageUrl}
                        alt={itemData.sku}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-amber/10">
                        <Gem className="h-10 w-10 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm truncate">{itemData.sku}</h4>
                  <p className="text-xs text-muted-foreground truncate">{itemData.itemName}</p>
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    {itemData.gemType && <span className="px-1.5 py-0.5 rounded bg-muted/50">{itemData.gemType}</span>}
                    {itemData.color && <span className="px-1.5 py-0.5 rounded bg-muted/50">{itemData.color}</span>}
                    {itemData.shape && <span className="px-1.5 py-0.5 rounded bg-muted/50">{itemData.shape}</span>}
                    <span className="px-1.5 py-0.5 rounded bg-muted/50">{itemData.carats.toFixed(2)}ct</span>
                    {itemData.clarity && <span className="px-1.5 py-0.5 rounded bg-muted/50">{itemData.clarity}</span>}
                    {itemData.cut && <span className="px-1.5 py-0.5 rounded bg-muted/50">{itemData.cut}</span>}
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(itemData.sellingPrice)}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Match Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MatchDetailCard label="Gem Type" passed={item.matchDetails.gemType} />
                  <MatchDetailCard label="Color" passed={item.matchDetails.color} />
                  <MatchDetailCard label="Shape" passed={item.matchDetails.shape} />
                  <MatchDetailCard
                    label={`Carat (Δ${item.matchDetails.carats.diff.toFixed(2)}ct)`}
                    passed={item.matchDetails.carats.withinTolerance}
                  />
                  <MatchDetailCard
                    label={`Clarity: ${item.matchDetails.clarity}`}
                    passed={item.matchDetails.clarity !== "mismatch"}
                    value={item.matchDetails.clarity}
                  />
                  <MatchDetailCard
                    label={`Cut: ${item.matchDetails.cut}`}
                    passed={item.matchDetails.cut !== "mismatch"}
                    value={item.matchDetails.cut}
                  />
                  <MatchDetailCard label="Origin" passed={item.matchDetails.origin} />
                  <MatchDetailCard label="Treatment" passed={item.matchDetails.treatment} />
                  <MatchDetailCard label="Certification" passed={item.matchDetails.certification} />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(item.totalValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Suggested Price</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(item.suggestedPrice)}</p>
                  <p className="text-xs text-primary/70">+{Math.round((item.suggestedPrice / item.totalValue - 1) * 100)}% premium</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button variant="secondary" className="flex-1 sm:flex-none gap-2" onClick={() => { onConfirm(item); onClose(); }}>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Match
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => onCreateQuotation(item)}>
                  <FileText className="h-4 w-4" />
                  Create Quotation
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => onListTogether(item)}>
                  <Link2 className="h-4 w-4" />
                  List Together
                </Button>
                <Button variant="destructive" className="flex-1 sm:flex-none gap-2" onClick={() => { onReject(item); onClose(); }}>
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}

function MatchDetailCard({ label, passed, value }: { label: string; passed: boolean; value?: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/50 border text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={cn(
        "text-sm font-semibold",
        passed ? "text-emerald-600" : "text-red-600"
      )}>
        {value || (passed ? "✓ Match" : "✗ Mismatch")}
      </p>
    </div>
  );
}