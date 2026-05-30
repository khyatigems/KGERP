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
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface RegenerateEbayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProgressData {
  total: number;
  updated: number;
  failed: number;
  pending: number;
  timeTaken: number;
}

interface Error {
  id: string;
  sku: string;
  error: string;
}

export function RegenerateEbayModal({
  open,
  onOpenChange,
}: RegenerateEbayModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [errors, setErrors] = useState<Error[]>([]);
  const [isComplete, setIsComplete] = useState(false);

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
      });
      setErrors(result.errors || []);

      if (result.status === "COMPLETED" || result.status === "FAILED") {
        isFinished = true;
        setIsComplete(true);
        if (result.status === "COMPLETED") {
          toast.success(
            `Regeneration finished: ${result.updated} updated, ${result.failed} failed.`
          );
        } else {
          toast.error(
            result.message || "Regeneration failed. Check errors for details."
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

    try {
      // Start regeneration task on the server and include credentials so auth cookies are sent
      const response = await fetch("/api/inventory/regenerate-ebay", {
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
        } catch (e) {
          // ignore JSON parse errors
        }
        throw new Error(errMsg);
      }

      const result = await response.json();
      if (!result.success || !result.taskId) {
        throw new Error(result.error || result.message || "Failed to start regeneration");
      }

      // Set an initial progress state so the UI moves out of the idle alert immediately
      setProgress({ total: 0, updated: 0, failed: 0, pending: 0, timeTaken: 0 });
      await pollTaskStatus(result.taskId);
    } catch (error) {
      console.error("Regenerate error:", error);
      const msg = error instanceof Error ? error.message : "Failed to regenerate eBay HTML descriptions";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Don't allow closing while processing
    setProgress(null);
    setErrors([]);
    setIsComplete(false);
    onOpenChange(false);
  };

  const progressPercent = progress && progress.total > 0
    ? (progress.updated / progress.total) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Regenerate eBay HTML Descriptions
          </DialogTitle>
          <DialogDescription>
            This will regenerate HTML descriptions for all inventory items using
            the latest eBay settings and category-specific images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!isComplete && progress === null && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This operation will regenerate descriptions for all inventory
                items. It may take a few moments depending on your inventory
                size.
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

              {isComplete && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✓ All descriptions have been regenerated successfully!
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
