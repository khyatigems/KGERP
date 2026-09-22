"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Search, Sparkles, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MatchedPairCard } from "@/components/dashboard/matched-pair-card";
import { MatchedPairModal } from "@/components/dashboard/matched-pair-modal";
import { MatchedPairItem, MatchedPairsResponse, MatchedPairTab } from "@/components/dashboard/matched-pairs-types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

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

export function InventoryMatchedPairsPage() {
  const [activeTab, setActiveTab] = useState<MatchedPairTab>("ALL");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    minScore: 90,
    gemType: "",
    quality: "ALL" as "ALL" | "excellent" | "good" | "possible",
  });
  const [selectedItem, setSelectedItem] = useState<MatchedPairItem | null>(null);
  const [exporting, setExporting] = useState(false);

  const params = new URLSearchParams();
  params.set("matchType", activeTab);
  params.set("minScore", String(filters.minScore));
  if (filters.gemType) params.set("gemType", filters.gemType);
  params.set("limit", "50");
  params.set("offset", String((page - 1) * 50));

  const { data, error, isLoading, mutate } = useSWR<MatchedPairsResponse>(
    `/api/inventory/matched-pairs?${params.toString()}`,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  const handleConfirm = async (item: MatchedPairItem) => {
    try {
      const res = await fetch("/api/inventory/pairs/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: item.id, suggestedPrice: item.suggestedPrice }),
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error("Confirm failed:", err);
    }
  };

  const handleReject = async (item: MatchedPairItem) => {
    try {
      const res = await fetch("/api/inventory/pairs/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairId: item.id }),
      });
      if (res.ok) mutate();
    } catch (err) {
      console.error("Reject failed:", err);
    }
  };

  const handleCreateQuotation = async (item: MatchedPairItem) => {
    const skuList = item.items.map(i => i.sku).join(",");
    window.open(`/quotes/new?skus=${encodeURIComponent(skuList)}`, "_blank");
  };

  const handleListTogether = async (item: MatchedPairItem) => {
    const skuList = item.items.map(i => i.sku).join(",");
    window.open(`/listings/new?paired=${encodeURIComponent(skuList)}`, "_blank");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportParams = new URLSearchParams();
      exportParams.set("matchType", activeTab);
      exportParams.set("minScore", String(filters.minScore));
      if (filters.gemType) exportParams.set("gemType", filters.gemType);
      exportParams.set("limit", "500");
      exportParams.set("offset", "0");

      const res = await fetch(`/api/inventory/matched-pairs?${exportParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();

      let allResults = json.results || [];
      if (filters.quality !== "ALL") {
        allResults = allResults.filter((item: MatchedPairItem) => getMatchQuality(item.score) === filters.quality);
      }

      if (allResults.length === 0) return;

      const headers = [
        "Match Type",
        "Score",
        "Quality",
        "SKUs",
        "Item Names",
        "Gem Types",
        "Colors",
        "Shapes",
        "Carats",
        "Clarity",
        "Cut",
        "Total Value",
        "Suggested Price",
      ];

      const rows = allResults.map((item: MatchedPairItem) => [
        item.matchType === "PAIR" ? "Pair" : `Set of ${item.matchType === "SET_3" ? 3 : 4}`,
        item.score,
        getMatchQuality(item.score),
        item.items.map(i => i.sku).join(" + "),
        item.items.map(i => i.itemName).join(" + "),
        item.items.map(i => i.gemType || "-").join(" + "),
        item.items.map(i => i.color || "-").join(" + "),
        item.items.map(i => i.shape || "-").join(" + "),
        item.items.map(i => i.carats).join(" + "),
        item.items.map(i => i.clarity || "-").join(" + "),
        item.items.map(i => i.cut || "-").join(" + "),
        item.totalValue,
        item.suggestedPrice,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matched-pairs-${activeTab.toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const results = data?.results || [];
  const filteredResults = results.filter(item => {
    const quality = getMatchQuality(item.score);
    if (filters.quality !== "ALL" && quality !== filters.quality) return false;
    return true;
  });

  const totalPages = Math.ceil((data?.total || 0) / 50);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Matched Pairs & Sets</h1>
            <p className="text-muted-foreground">Find and manage matched gemstone pairs and sets</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-500">Failed to load matched pairs.</p>
            <Button onClick={() => mutate()} variant="outline" className="mt-3">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Matched Pairs & Sets</h1>
            <p className="text-muted-foreground">Find and manage matched gemstone pairs and sets</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 animate-pulse bg-muted/50 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Matched Pairs & Sets</h1>
          <p className="text-muted-foreground">Find and manage matched gemstone pairs and sets</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Matched Pairs & Sets Finder
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {data?.summary.totalPairs || 0} Pairs · {data?.summary.totalSets || 0} Sets
              </Badge>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MatchedPairTab)} className="flex-1 sm:flex-none">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="PAIR">Pairs</TabsTrigger>
                <TabsTrigger value="SET_3">Sets of 3</TabsTrigger>
                <TabsTrigger value="SET_4">Sets of 4</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select
              value={String(filters.minScore)}
              onValueChange={(v) => setFilters(f => ({ ...f, minScore: Number(v) }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Min Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">Min Score: 90+</SelectItem>
                <SelectItem value="110">Min Score: 110+</SelectItem>
                <SelectItem value="130">Min Score: 130+</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.quality}
              onValueChange={(v) => setFilters(f => ({ ...f, quality: v as "ALL" | "excellent" | "good" | "possible" }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Quality</SelectItem>
                <SelectItem value="excellent">Excellent (≥130)</SelectItem>
                <SelectItem value="good">Good (≥110)</SelectItem>
                <SelectItem value="possible">Possible (≥90)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Gem Type (e.g. Diamond)"
              value={filters.gemType}
              onChange={(e) => setFilters(f => ({ ...f, gemType: e.target.value }))}
              className="flex-1 max-w-[250px]"
            />
            <Select
              value={String(page)}
              onValueChange={(v) => setPage(Number(v))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Page" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(p => (
                  <SelectItem key={p} value={String(p)}>Page {p} of {totalPages}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            {isLoading && !data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse bg-muted/50 rounded-lg" />
              ))
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No matched pairs/sets found</p>
                <p className="text-sm">Adjust filters or add more inventory items</p>
              </div>
            ) : (
              filteredResults.map((item, index) => (
                <MatchedPairCard
                  key={item.id}
                  item={item}
                  index={index}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                  onCreateQuotation={handleCreateQuotation}
                  onListTogether={handleListTogether}
                  onViewDetails={() => setSelectedItem(item)}
                />
              ))
            )}
          </div>

          {data && data.total > 50 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({data.total} total)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
    </div>
  );
}