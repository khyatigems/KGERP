"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RetryMarketplaceSyncButton } from "@/components/marketplace/retry-sync-button";
import { forgetMarketplaceSyncBatch, readMarketplaceSyncBatches } from "@/components/marketplace/sync-client";

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
  updatedAt: string;
  marketplaceShop: { marketplace: string; name: string };
};

export function MarketplaceSyncToastMonitor() {
  const [batches, setBatches] = useState<string[]>(() => typeof window === "undefined" ? [] : readMarketplaceSyncBatches());
  const [jobsByBatch, setJobsByBatch] = useState<Record<string, SyncJob[]>>({});
  const [finishedBatches, setFinishedBatches] = useState<string[]>([]);
  const workerInFlight = useRef(false);
  const workerKickFailures = useRef(0);
  const nextWorkerKickAt = useRef(0);

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
      let hasQueuedJobs = false;
      for (const batchId of pendingBatches) {
        try {
          const response = await fetch(`/api/integrations/marketplace/sync?batchId=${encodeURIComponent(batchId)}`, { cache: "no-store" });
          if (!response.ok) continue;
          const payload = await response.json() as { jobs: SyncJob[] };
          if (!cancelled) {
            const jobs = payload.jobs || [];
            if (jobs.some((job) => {
              if (job.status === "QUEUED") return true;
              if (job.status !== "PROCESSING") return false;
              return Date.now() - new Date(job.updatedAt).getTime() > 2 * 60 * 1000;
            })) hasQueuedJobs = true;
            setJobsByBatch((current) => ({ ...current, [batchId]: jobs }));
            if (jobs.length && jobs.every((job) => !["QUEUED", "PROCESSING"].includes(job.status))) {
              setFinishedBatches((current) => current.includes(batchId) ? current : [...current, batchId]);
            }
          }
        } catch {
          // Keep the batch visible and try again on the next polling cycle.
        }
      }
      if (hasQueuedJobs && !workerInFlight.current && !cancelled && Date.now() >= nextWorkerKickAt.current) {
        workerInFlight.current = true;
        try {
          const response = await fetch("/api/integrations/marketplace/sync/process", { method: "POST" });
          if (!response.ok) throw new Error(`Worker returned ${response.status}`);
          workerKickFailures.current = 0;
          nextWorkerKickAt.current = 0;
        } catch {
          workerKickFailures.current += 1;
          const delayMs = Math.min(30_000, 1_000 * (2 ** Math.min(workerKickFailures.current, 5)));
          nextWorkerKickAt.current = Date.now() + delayMs;
        } finally {
          workerInFlight.current = false;
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
              forgetMarketplaceSyncBatch(batchId);
              const remaining = readMarketplaceSyncBatches();
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
          {failed > 0 && (
            <div className="mt-2 flex justify-end">
              <RetryMarketplaceSyncButton
                jobIds={jobs.filter((job) => job.status === "FAILED" || job.status === "PARTIAL").map((job) => job.id)}
              />
            </div>
          )}
        </div>
      ), { id: toastId, duration: Infinity, position: "bottom-right" });
    }
  }, [jobsByBatch]);

  return null;
}