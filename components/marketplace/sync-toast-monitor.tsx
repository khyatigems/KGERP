"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "marketplace-sync-batches";

type SyncJob = {
  id: string;
  status: string;
  syncType: string;
  progressStep: string;
  progressDetail: string | null;
  recordsScanned: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorDetails: string | null;
  marketplaceShop: { marketplace: string; name: string };
};

function readBatches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function rememberMarketplaceSyncBatch(batchId: string) {
  const batches = readBatches();
  if (!batches.includes(batchId)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...batches, batchId]));
  window.dispatchEvent(new CustomEvent("marketplace-sync-batch", { detail: { batchId } }));
}

export function MarketplaceSyncToastMonitor() {
  const [batches, setBatches] = useState<string[]>(() => typeof window === "undefined" ? [] : readBatches());
  const [jobsByBatch, setJobsByBatch] = useState<Record<string, SyncJob[]>>({});
  const [finishedBatches, setFinishedBatches] = useState<string[]>([]);

  useEffect(() => {
    const handleBatch = (event: Event) => {
      const batchId = (event as CustomEvent<{ batchId: string }>).detail?.batchId;
      if (batchId) setBatches((current) => current.includes(batchId) ? current : [...current, batchId]);
    };
    window.addEventListener("marketplace-sync-batch", handleBatch);
    return () => window.removeEventListener("marketplace-sync-batch", handleBatch);
  }, []);

  useEffect(() => {
    const pendingBatches = batches.filter((batchId) => !finishedBatches.includes(batchId));
    if (!pendingBatches.length) return;
    let cancelled = false;
    const poll = async () => {
      for (const batchId of pendingBatches) {
        try {
          const response = await fetch(`/api/integrations/marketplace/sync?batchId=${encodeURIComponent(batchId)}`, { cache: "no-store" });
          if (!response.ok) continue;
          const payload = await response.json() as { jobs: SyncJob[] };
          if (!cancelled) {
            const jobs = payload.jobs || [];
            setJobsByBatch((current) => ({ ...current, [batchId]: jobs }));
            if (jobs.length && jobs.every((job) => !["QUEUED", "PROCESSING"].includes(job.status))) {
              setFinishedBatches((current) => current.includes(batchId) ? current : [...current, batchId]);
            }
          }
        } catch {
          // Keep the batch visible and try again on the next polling cycle.
        }
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [batches, finishedBatches]);

  useEffect(() => {
    for (const [batchId, jobs] of Object.entries(jobsByBatch)) {
      const toastId = `marketplace-sync-${batchId}`;
      const active = jobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING");
      const failed = jobs.filter((job) => job.status === "FAILED" || job.status === "PARTIAL").length;
      toast.custom((id) => (
        <div className="w-[min(520px,calc(100vw-32px))] rounded-md border bg-background p-3 text-foreground shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">
                Marketplace sync {active ? "in progress" : failed ? "completed with errors" : "completed"}
              </div>
              <div className="text-xs text-muted-foreground">{jobs.length} shop job{jobs.length === 1 ? "" : "s"} · {jobs[0]?.syncType.toLowerCase()}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {
              toast.dismiss(id);
              const remaining = readBatches().filter((value) => value !== batchId);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
              setBatches(remaining);
            }}>Close</Button>
          </div>
          <div className="mt-2 space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{job.marketplaceShop.marketplace} · {job.marketplaceShop.name}</div>
                  <div className="text-xs text-muted-foreground">{job.progressStep}: {job.progressDetail || job.status}</div>
                </div>
                <span className="shrink-0 text-xs tabular-nums">{job.recordsScanned} scanned</span>
              </div>
            ))}
          </div>
          <details className="mt-2 border-t pt-2 text-xs">
            <summary className="cursor-pointer font-medium">Sync details and errors</summary>
            <div className="mt-2 space-y-2">
              {jobs.map((job) => (
                <div key={`${job.id}-details`} className="rounded-sm bg-muted/50 p-2">
                  <div className="font-medium">{job.marketplaceShop.marketplace} · {job.marketplaceShop.name} · {job.status}</div>
                  <div>Scanned {job.recordsScanned}, created {job.recordsCreated}, updated {job.recordsUpdated}, skipped {job.recordsSkipped}, failed {job.recordsFailed}</div>
                  {job.errorDetails && <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-destructive">{job.errorDetails}</pre>}
                </div>
              ))}
            </div>
          </details>
        </div>
      ), { id: toastId, duration: Infinity, position: "bottom-right" });
    }
  }, [jobsByBatch]);

  return null;
}