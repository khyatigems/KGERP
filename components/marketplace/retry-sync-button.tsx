"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberMarketplaceSyncBatch } from "@/components/marketplace/sync-client";

export function RetryMarketplaceSyncButton({
  jobIds,
  label = "Retry failed shops",
}: {
  jobIds: string[];
  label?: string;
}) {
  const [pending, setPending] = useState(false);

  const retry = async () => {
    if (!jobIds.length || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/integrations/marketplace/sync/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not retry marketplace sync");
      rememberMarketplaceSyncBatch(payload.batchId);
      void fetch("/api/integrations/marketplace/sync/process", { method: "POST" }).catch(() => null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not retry marketplace sync", { duration: Infinity });
    } finally {
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void retry()} disabled={pending || jobIds.length === 0}>
      <RotateCcw className="mr-2 h-3.5 w-3.5" />
      {pending ? "Queueing retry..." : label}
    </Button>
  );
}
