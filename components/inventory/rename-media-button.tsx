"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, X, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type RenameSkuItem = {
  inventoryId: string;
  sku: string;
  attempted: number;
  tagged: number;
  failed: number;
  failures: Array<{ mediaId: string; mediaUrl: string; reason: string; message?: string }>;
};

type RenameReport = {
  limit: number;
  totalCandidates: number;
  returned: number;
  processed: number;
  tagged: number;
  failed: number;
  orphaned: number;
  orphanMediaIds?: string[];
  skuItems: RenameSkuItem[];
};

type FilterMode = "all" | "failed" | "tagged";

export function RenameMediaButton({ inventoryId }: { inventoryId?: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<RenameReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  const run = () => {
    startTransition(async () => {
      setError(null);
      setReport(null);
      try {
        const sp = new URLSearchParams();
        sp.set("limit", inventoryId ? "50" : "500");
        if (inventoryId) sp.set("inventoryId", inventoryId);

        const res = await fetch(`/api/cron/inventory/rename-media?${sp.toString()}`, {
          method: "GET",
        });
        const json = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          const msg =
            (json && (json.error || json.message))
              ? String(json.error || json.message)
              : `Request failed (${res.status} ${res.statusText})`;
          throw new Error(msg);
        }

        setReport({
          limit: Number(json?.limit || 0),
          totalCandidates: Number(json?.totalCandidates || 0),
          returned: Number(json?.returned || 0),
          processed: Number(json?.processed || 0),
          tagged: Number(json?.tagged || 0),
          failed: Number(json?.failed || 0),
          orphaned: Number(json?.orphaned || 0),
          orphanMediaIds: Array.isArray(json?.orphanMediaIds) ? json.orphanMediaIds : undefined,
          skuItems: Array.isArray(json?.skuItems) ? json.skuItems : [],
        });
        toast.success("Tag media job completed");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to tag media";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  const rows = useMemo(() => {
    const items = report?.skuItems || [];
    const q = query.trim().toLowerCase();
    return items
      .filter((s) => {
        if (filter === "failed") return s.failed > 0;
        if (filter === "tagged") return s.tagged > 0;
        return true;
      })
      .filter((s) => {
        if (!q) return true;
        return s.sku.toLowerCase().includes(q);
      });
  }, [report, filter, query]);

  const title = inventoryId ? "Tag Media Report (SKU)" : "Tag Media Report";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(true);
            run();
          }}
        >
          <RefreshCw className={"mr-2 h-4 w-4" + (isPending ? " animate-spin" : "")} />
          Tag Media
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-[1200px] h-[92vh] max-h-[92vh] p-0 flex flex-col overflow-hidden"
      >
          <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription>
                {inventoryId ? "Tagging media for this inventory item" : "Tagging media in batches"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={run}
              >
                <RefreshCw className={"mr-2 h-4 w-4" + (isPending ? " animate-spin" : "")} />
                Run again
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
            {isPending && !report && !error && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                <div className="text-sm text-muted-foreground">Running... please wait</div>
              </div>
            )}

            {error && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div className="text-sm text-destructive text-center max-w-[700px]">{error}</div>
                <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={run}>
                  Try again
                </Button>
              </div>
            )}

            {report && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Returned / Total</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {report.returned} / {report.totalCandidates}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Limit: {report.limit}</div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Tagged
                    </div>
                    <div className="text-lg font-semibold tabular-nums">{report.tagged}</div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Failed
                    </div>
                    <div className="text-lg font-semibold tabular-nums">{report.failed}</div>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-xs text-muted-foreground">Orphan media</div>
                    <div className="text-lg font-semibold tabular-nums">{report.orphaned}</div>
                    <div className="text-[11px] text-muted-foreground">Missing inventory rows</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant={filter === "failed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("failed")}
                    >
                      Failed
                    </Button>
                    <Button
                      type="button"
                      variant={filter === "tagged" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("tagged")}
                    >
                      Tagged
                    </Button>

                    {report.orphaned > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          if (!confirm(`Delete ${report.orphaned} orphan media entries? This cannot be undone.`)) return;
                          startTransition(async () => {
                            try {
                              const sp = new URLSearchParams();
                              sp.set("limit", inventoryId ? "50" : "500");
                              if (inventoryId) sp.set("inventoryId", inventoryId);
                              sp.set("cleanupOrphans", "1");

                              const res = await fetch(`/api/cron/inventory/rename-media?${sp.toString()}`, { method: "GET" });
                              const json = await res.json().catch(() => ({} as any));
                              if (!res.ok) {
                                throw new Error(String(json?.error || json?.message || "Failed to delete orphans"));
                              }
                              toast.success(`Deleted ${Number(json?.deletedOrphans || 0)} orphan media entries`);
                              run();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed to delete orphans");
                            }
                          });
                        }}
                      >
                        Delete orphans
                      </Button>
                    )}
                  </div>

                  <div className="relative w-full md:w-[340px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search SKU..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="rounded-md border bg-background overflow-hidden">
                  <div className="h-[52vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                      <div className="min-w-[1100px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-3">SKU</th>
                          <th className="text-right p-3">Attempted</th>
                          <th className="text-right p-3">Tagged</th>
                          <th className="text-right p-3">Failed</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((s) => {
                          const status = s.failed > 0 ? "Failed" : s.tagged > 0 ? "Tagged" : "OK";
                          const variant = s.failed > 0 ? "destructive" : s.tagged > 0 ? "default" : "secondary";
                          return (
                            <tr key={s.inventoryId} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="p-3 font-mono whitespace-nowrap">{s.sku}</td>
                              <td className="p-3 text-right tabular-nums">{s.attempted}</td>
                              <td className="p-3 text-right tabular-nums">{s.tagged}</td>
                              <td className="p-3 text-right tabular-nums">{s.failed}</td>
                              <td className="p-3">
                                <Badge variant={variant as any}>{status}</Badge>
                              </td>
                              <td className="p-3 text-xs text-muted-foreground">
                                {s.failures.length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <details>
                                    <summary className="cursor-pointer select-none text-foreground">View errors</summary>
                                    <div className="mt-2 space-y-2">
                                      {s.failures.slice(0, 10).map((f) => (
                                        <div key={f.mediaId} className="rounded-md border bg-muted/30 p-2">
                                          <div className="font-mono text-[11px] break-all">{f.mediaId}</div>
                                          <div className="text-[11px] break-all">{f.mediaUrl}</div>
                                          <div className="text-[11px] text-destructive">{f.message || f.reason}</div>
                                        </div>
                                      ))}
                                      {s.failures.length > 10 && (
                                        <div className="text-[11px] text-muted-foreground">
                                          Showing first 10 errors.
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                              No rows match your filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
