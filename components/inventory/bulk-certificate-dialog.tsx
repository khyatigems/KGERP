"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateBulkGciCertificates } from "@/app/actions/gci";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface BulkCertificateDialogProps {
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type BulkResult = {
  message: string;
  total: number;
  generated: number;
  failed: number;
  failures: Array<{ inventoryId: string; sku: string; reason: string }>;
};

export function BulkCertificateDialog({ selectedIds, open, onOpenChange, onSuccess }: BulkCertificateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await generateBulkGciCertificates(selectedIds);
      if (!response.success && response.generated === 0) {
        toast.error(response.message);
      } else if (response.failed > 0) {
        toast.warning(response.message);
      } else {
        toast.success(response.message);
      }
      setResult({
        message: response.message,
        total: response.total,
        generated: response.generated,
        failed: response.failed,
        failures: response.failures
      });
      if (response.generated > 0) {
        onSuccess();
      }
    } catch {
      toast.error("Bulk certificate generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk GCI Certificate Generation</DialogTitle>
          <DialogDescription>
            Generate GCI certificates for {selectedIds.length} selected inventory item(s). Items with incomplete checklist will be skipped with reasons.
          </DialogDescription>
        </DialogHeader>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="text-muted-foreground">Selected</div>
                <div className="text-lg font-semibold">{result.total}</div>
              </div>
              <div className="rounded-md border p-3 bg-green-50">
                <div className="text-green-700">Generated</div>
                <div className="text-lg font-semibold text-green-700">{result.generated}</div>
              </div>
              <div className="rounded-md border p-3 bg-amber-50">
                <div className="text-amber-700">Failed</div>
                <div className="text-lg font-semibold text-amber-700">{result.failed}</div>
              </div>
            </div>
            <div className="text-sm">{result.message}</div>
            {result.failures.length > 0 && (
              <ScrollArea className="h-56 rounded-md border p-3">
                <div className="space-y-2">
                  {result.failures.map((failure) => (
                    <div key={failure.inventoryId} className="rounded border bg-amber-50 px-3 py-2 text-xs">
                      <div className="font-semibold text-amber-800">{failure.sku}</div>
                      <div className="text-amber-700">{failure.reason}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading || selectedIds.length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : result ? <ShieldAlert className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isLoading ? "Generating..." : result ? "Run Again" : "Generate Certificates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
