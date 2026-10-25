"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/erp-feedback";
import { MarketplaceSyncToast, type SyncJob } from "./sync-toast";
import { forgetMarketplaceSyncBatch, readMarketplaceSyncBatches } from "@/components/marketplace/sync-client";

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
    let pollInFlight = false;
    const poll = async () => {
      if (cancelled || pollInFlight) return;
      pollInFlight = true;
      try {
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
              // Old completed batches retained in browser storage are history, not a new sync result.
              const terminal = jobs.length > 0 && jobs.every((job) => !["QUEUED", "PROCESSING"].includes(job.status));
              const completedAt = Math.max(...jobs.map((job) => Date.parse(job.updatedAt)));
              if (terminal && Number.isFinite(completedAt) && Date.now() - completedAt > 15 * 60 * 1000) {
                forgetMarketplaceSyncBatch(batchId);
                toast.dismiss(`marketplace-sync-${batchId}`);
                toast.dismiss(`marketplace-sync-${batchId}-completed`);
                setJobsByBatch((current) => { const next = { ...current }; delete next[batchId]; return next; });
                setBatches((current) => current.filter((id) => id !== batchId));
                continue;
              }
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
      } finally {
        pollInFlight = false;
      }
    };
    void poll();
    const timer = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [batches, finishedBatches]);

  useEffect(() => {
    for (const [batchId, jobs] of Object.entries(jobsByBatch)) {
      const toastId = `marketplace-sync-${batchId}`;
      const terminal = jobs.length > 0 && jobs.every((job) => !["QUEUED", "PROCESSING"].includes(job.status));
      const completedToastId = `${toastId}-completed`;
      if (terminal) toast.dismiss(toastId);
      toast.custom((id) => (
        <MarketplaceSyncToast jobs={jobs} onDismiss={() => {
          toast.dismiss(id);
          forgetMarketplaceSyncBatch(batchId);
          setBatches(readMarketplaceSyncBatches());
          setJobsByBatch((current) => {
            const next = { ...current };
            delete next[batchId];
            return next;
          });
        }} />
      ), { id: terminal ? completedToastId : toastId, duration: terminal ? 12_000 : Infinity, position: "bottom-right" });
    }
  }, [jobsByBatch]);

  return null;
}
