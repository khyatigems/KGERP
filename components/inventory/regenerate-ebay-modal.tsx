"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

interface RegenerateEbayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemIds?: string[]; // Items selected for regeneration
}

interface ProgressData {
  total: number;
  updated: number;
  failed: number;
  pending: number;
  timeTaken: number;
  status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  message?: string;
}

interface Error {
  id: string;
  sku: string;
  error: string;
}

export function RegenerateEbayModal({
  open,
  onOpenChange,
  selectedItemIds,
}: RegenerateEbayModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [errors, setErrors] = useState<Error[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const pollTaskStatus = async (taskId: string) => {
    let isFinished = false;
    while (!isFinished) {
      const response = await fetch(
        `/api/inventory/regenerate-ebay?taskId=${encodeURIComponent(taskId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to poll regeneration status");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to read regeneration status");
      }

      setProgress({
        total: result.total,
        updated: result.updated,
        failed: result.failed,
        pending: result.pending,
        timeTaken: result.timeTaken || 0,
        status: result.status,
        message: result.message,
      });
      setErrors(result.errors || []);

      if (result.status === "COMPLETED" || result.status === "FAILED" || result.status === "CANCELLED") {
        isFinished = true;
        setIsComplete(true);
        if (result.status === "COMPLETED" && result.failed === 0) {
          toast.success(`Regeneration finished: ${result.updated} updated.`);
        } else if (result.status === "CANCELLED") {
          toast.warning(result.message || "Regeneration cancelled.");
        } else {
          toast.error(
            result.message || `Regeneration finished with ${result.failed} failed item(s).`
          );
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    setProgress(null);
    setErrors([]);
    setIsComplete(false);
    setTaskId(null);
    setIsCancelling(false);

    try {
      // Build URL with itemIds if provided
      const url = new URL("/api/inventory/regenerate-ebay", window.location.origin);
      if (selectedItemIds && selectedItemIds.length > 0) {
        url.searchParams.set("itemIds", JSON.stringify(selectedItemIds));
      }

      // Start regeneration task on the server and include credentials so auth cookies are sent
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      // Provide a clearer error message by reading the JSON body when the response is not OK
      if (!response.ok) {
        let errMsg = "Failed to start regeneration";
        try {
          const body = await response.json();
          errMsg = body?.error || body?.message || errMsg;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (!result.success || !result.taskId) {
        throw new Error(result.error || result.message || "Failed to start regeneration");
      }

      setTaskId(result.taskId);
      // Set an initial progress state so the UI moves out of the idle alert immediately
      setProgress({ total: 0, updated: 0, failed: 0, pending: 0, timeTaken: 0, status: "PENDING" });
      await pollTaskStatus(result.taskId);
    } catch (error) {
      console.error("Regenerate error:", error);
      const msg = error instanceof Error ? error.message : "Failed to regenerate eBay HTML descriptions";
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsCancelling(false);
    }
  };

  const handleCancelTask = async () => {
    if (!taskId || isCancelling) return;

    setIsCancelling(true);
    try {
      const response = await fetch(
        `/api/inventory/regenerate-ebay?taskId=${encodeURIComponent(taskId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || result?.message || "Failed to cancel regeneration");
      }

      setProgress((current) =>
        current
          ? {
              ...current,
              status: "CANCELLED",
              total: result.total ?? current.total,
              updated: result.updated ?? current.updated,
              failed: result.failed ?? current.failed,
              pending: result.pending ?? current.pending,
              message: result.message ?? current.message,
            }
          : current
      );
      toast.info("Cancelling regeneration after the current item finishes.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to cancel regeneration";
      toast.error(msg);
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Don't allow closing while processing
    setProgress(null);
    setErrors([]);
    setIsComplete(false);
    setTaskId(null);
    setIsCancelling(false);
    onOpenChange(false);
  };

  const progressPercent = progress && progress.total > 0
    ? ((progress.updated + progress.failed) / progress.total) * 100
    : 0;
  const hasFailures = Boolean(progress && progress.failed > 0);
  const isCancelled = progress?.status === "CANCELLED";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate eBay HTML Descriptions
          </DialogTitle>
          <DialogDescription>
            {selectedItemIds && selectedItemIds.length > 0
              ? `This will regenerate HTML descriptions for ${selectedItemIds.length} selected item(s) using the latest eBay settings and category-specific images.`
              : `This will regenerate HTML descriptions for all inventory items using the latest eBay settings and category-specific images.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isComplete && progress === null && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {selectedItemIds && selectedItemIds.length > 0
                  ? `This operation will regenerate descriptions for ${selectedItemIds.length} selected item(s). It may take a few moments.`
                  : `This operation will regenerate descriptions for all inventory items. It may take a few moments depending on your inventory size.`}
              </AlertDescription>
            </Alert>
          )}

          {progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-semibold">
                    {progress.updated} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Updated</div>
                  <div className="text-2xl font-bold text-green-600">
                    {progress.updated}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Failed</div>
                  <div
                    className={`text-2xl font-bold ${
                      progress.failed > 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {progress.failed}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {progress.pending}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Time Taken
                  </div>
                  <div className="text-2xl font-bold">{progress.timeTaken}s</div>
                </div>
              </div>

              {isComplete && !hasFailures && !isCancelled && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    All descriptions have been regenerated successfully.
                  </AlertDescription>
                </Alert>
              )}

              {isComplete && isCancelled && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {progress.message || `Regeneration cancelled. ${progress.updated} updated, ${progress.failed} failed, ${progress.pending} skipped.`}
                  </AlertDescription>
                </Alert>
              )}

              {isComplete && hasFailures && !isCancelled && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {progress.message || `Regeneration finished with ${progress.failed} failed item(s).`}
                  </AlertDescription>
                </Alert>
              )}

              {errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600">
                    Failed Items ({errors.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
                    {errors.map((error) => (
                      <div
                        key={error.id}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-mono">{error.sku}</span> -{" "}
                        {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!isLoading && (
            <Button type="button" variant="outline" onClick={handleClose}>
              {isComplete ? "Close" : "Cancel"}
            </Button>
          )}
          {isLoading && taskId && !isComplete && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelTask}
              disabled={isCancelling}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              {isCancelling ? "Cancelling..." : "Cancel"}
            </Button>
          )}
          {!isComplete && (
            <Button
              type="button"
              onClick={handleRegenerate}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Start Regeneration
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
