"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Trash2, Download, RefreshCw, Zap, Package, FileText, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LottieAnimation, LottieLoader } from "@/components/ui/lottie";
import { getAnimationConfig } from "@/components/ui/lottie/animations";

export type BulkActionType = "delete" | "export" | "status-change" | "assign" | "sync" | "custom";

export interface BulkActionItem {
  id: string;
  label: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

export interface BulkActionTheaterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionType: BulkActionType;
  items: BulkActionItem[];
  onExecute: (items: BulkActionItem[]) => Promise<void>;
  onCancel?: () => void;
  showProgress?: boolean;
  maxConcurrent?: number;
}

const actionTypeConfig: Record<BulkActionType, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  delete: { icon: <Trash2 className="h-5 w-5" />, color: "text-red-500", bg: "bg-red-500/10", label: "Deleting" },
  export: { icon: <Download className="h-5 w-5" />, color: "text-primary", bg: "bg-primary/10", label: "Exporting" },
  "status-change": { icon: <RefreshCw className="h-5 w-5" />, color: "text-amber-500", bg: "bg-amber-500/10", label: "Updating Status" },
  assign: { icon: <Users className="h-5 w-5" />, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Assigning" },
  sync: { icon: <Zap className="h-5 w-5" />, color: "text-purple-500", bg: "bg-purple-500/10", label: "Syncing" },
  custom: { icon: <Package className="h-5 w-5" />, color: "text-blue-500", bg: "bg-blue-500/10", label: "Processing" },
};

export function BulkActionTheater({
  open,
  onOpenChange,
  title,
  description,
  actionType,
  items,
  onExecute,
  onCancel,
  showProgress = true,
  maxConcurrent = 3,
}: BulkActionTheaterProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [itemStatuses, setItemStatuses] = useState<Record<string, BulkActionItem["status"]>>({});

  const config = actionTypeConfig[actionType];
  const totalItems = items.length;
  const progress = totalItems > 0 ? Math.round(((completedCount + failedCount) / totalItems) * 100) : 0;

  const animationKey = actionType === "export" ? "exportSuccess" : "saveSuccess";
  const animationConfig = getAnimationConfig(animationKey);

  const executeNext = useCallback(async () => {
    if (currentIndex >= items.length) {
      setIsExecuting(false);
      return;
    }

    const item = items[currentIndex];
    setItemStatuses(prev => ({ ...prev, [item.id]: "processing" }));

    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing delay
      setItemStatuses(prev => ({ ...prev, [item.id]: "success" }));
      setCompletedCount(prev => prev + 1);
    } catch (error) {
      setItemStatuses(prev => ({ ...prev, [item.id]: "error" }));
      setFailedCount(prev => prev + 1);
    }

    setCurrentIndex(prev => prev + 1);
  }, [items, currentIndex]);

  useEffect(() => {
    if (isExecuting && currentIndex < items.length) {
      executeNext();
    }
  }, [isExecuting, currentIndex, items.length, executeNext]);

  const handleExecute = async () => {
    setIsExecuting(true);
    setCurrentIndex(0);
    setCompletedCount(0);
    setFailedCount(0);
    setItemStatuses(items.reduce((acc, item) => ({ ...acc, [item.id]: "pending" }), {}));
    
    try {
      await onExecute(items);
    } catch (error) {
      console.error("Bulk action failed:", error);
    }
  };

  const handleClose = () => {
    if (!isExecuting) {
      onOpenChange(false);
      onCancel?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", config.bg)}>
              {isExecuting && progress < 100 ? (
                <LottieLoader variant="export" style={{ width: 24, height: 24 }} className="text-primary" />
              ) : progress === 100 && completedCount > 0 ? (
                <LottieAnimation config={animationConfig} className="w-6 h-6" />
              ) : (
                config.icon
              )}
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {config.icon}
                {title}
              </DialogTitle>
              <DialogDescription>
                {description || `${config.label} ${totalItems} item${totalItems !== 1 ? "s" : ""}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {showProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.label} {completedCount + failedCount} of {totalItems}
                </span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completedCount} completed</span>
                {failedCount > 0 && <span className="text-red-500">{failedCount} failed</span>}
                {isExecuting && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </div>
            </div>
          )}

          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {items.map((item) => {
              const status = itemStatuses[item.id] || item.status;
              const statusConfig = {
                pending: { icon: <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />, label: "Pending", color: "text-muted-foreground" },
                processing: { icon: <Loader2 className="h-3 w-3 animate-spin text-primary" />, label: "Processing...", color: "text-primary" },
                success: { icon: <Check className="h-3 w-3 text-emerald-500" />, label: "Done", color: "text-emerald-500" },
                error: { icon: <X className="h-3 w-3 text-red-500" />, label: "Failed", color: "text-red-500" },
              };
              const s = statusConfig[status];

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    status === "processing" && "bg-primary/5 border-primary/20",
                    status === "success" && "bg-emerald-500/5 border-emerald-500/10",
                    status === "error" && "bg-red-500/5 border-red-500/10"
                  )}
                >
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", s.color.replace("text-", "bg-"))}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", s.color)}>{item.label}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                  {item.error && status === "error" && (
                    <div className="text-xs text-red-500 max-w-xs truncate" title={item.error}>
                      {item.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {progress === 100 && completedCount > 0 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-3">
                <LottieAnimation config={animationConfig} className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    {completedCount} of {totalItems} completed successfully
                  </p>
                  {failedCount > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {failedCount} failed
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isExecuting ? (
            <Button variant="outline" onClick={() => setIsExecuting(false)} disabled={progress === 100}>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {progress === 100 ? "Done" : "Pause"}
            </Button>
          ) : progress === 100 ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isExecuting}>
                Cancel
              </Button>
              <Button onClick={handleExecute} disabled={isExecuting || totalItems === 0}>
                {config.icon}
                Start {config.label}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useBulkActionTheater() {
  const [theaterState, setTheaterState] = useState<{
    open: boolean;
    config: Omit<BulkActionTheaterProps, "open" | "onOpenChange"> | null;
  }>({ open: false, config: null });

  const open = useCallback((config: Omit<BulkActionTheaterProps, "open" | "onOpenChange">) => {
    setTheaterState({ open: true, config });
  }, []);

  const close = useCallback(() => {
    setTheaterState({ open: false, config: null });
  }, []);

  return { theaterState, open, close };
}

export function BulkActionTheaterProvider({ children }: { children: React.ReactNode }) {
  const { theaterState, open, close } = useBulkActionTheater();

  return (
    <>
      {children}
      {theaterState.config && (
        <BulkActionTheater
          open={theaterState.open}
          onOpenChange={close}
          {...theaterState.config}
        />
      )}
    </>
  );
}