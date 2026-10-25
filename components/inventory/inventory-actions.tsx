"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, MoreHorizontal, Pencil, IndianRupee, FileText, Printer, Lock, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
import { toast } from "@/lib/erp-feedback";
import { updateInventoryStatus } from "@/app/(dashboard)/inventory/actions";
import { useGlobalLoader } from "@/components/global-loader-provider";

const InventoryQrDialog = dynamic(
  () => import("./inventory-qr").then((m) => ({ default: m.InventoryQrDialog })),
  { ssr: false }
);
const PackagingPrintDialog = dynamic(
  () => import("@/components/packaging/packaging-print-dialog").then(m => ({ default: m.PackagingPrintDialog })),
  { ssr: false }
);
const LabelPrintDialog = dynamic(
  () => import("./label-print-dialog").then((m) => ({ default: m.LabelPrintDialog })),
  { ssr: false }
);
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface InventoryActionsProps {
  compact?: boolean;
  item: {
    id: string;
    itemName: string;
    internalName?: string | null;
    sku: string;
    status: string;
    gemType?: string | null;
    colorCode?: { name: string } | null;
    weightValue?: number | null;
    weightUnit?: string | null;
    weightRatti?: number | null;
    pricingMode?: string;
    sellingRatePerCarat?: number | null;
    flatSellingPrice?: number | null;
    shape?: string | null;
    dimensionsMm?: string | null;
    stockLocation?: string | null;
  };
}

export function InventoryActions({ item, compact = false }: InventoryActionsProps) {
  const router = useRouter();
  const { showLoader } = useGlobalLoader();
  const [packagingOpen, setPackagingOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<"IN_STOCK" | "RESERVED" | "MEMO">("RESERVED");
  const [statusReason, setStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const sellingPrice = item.pricingMode === "PER_CARAT"
    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
    : item.flatSellingPrice || 0;

  return (
    <div className="flex items-center justify-end gap-1">
      {!compact && <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="View inventory details">
        <Link href={`/inventory/${item.id}`} onClick={() => showLoader()} aria-label={`View details for ${item.sku}`}>
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>}
      <InventoryQrDialog itemName={item.itemName} sku={item.sku} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="transition-transform hover:scale-110">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/inventory/${item.id}`} onClick={() => showLoader()}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/inventory/${item.id}/copy`} onClick={() => showLoader()}>
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Link>
          </DropdownMenuItem>
          {item.status === "IN_STOCK" && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/inventory/${item.id}/edit`} onClick={() => showLoader()}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setStatusTarget("RESERVED");
                  setStatusReason("");
                  setStatusDialogOpen(true);
                }}
              >
                <Lock className="mr-2 h-4 w-4" /> Mark as Reserved
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setStatusTarget("MEMO");
                  setStatusReason("");
                  setStatusDialogOpen(true);
                }}
              >
                <Clock className="mr-2 h-4 w-4" /> Mark as Memo
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/sales/new?inventoryId=${item.id}`} onClick={() => showLoader()}>
                  <IndianRupee className="mr-2 h-4 w-4" /> Mark as Sold
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/quotes/new?inventoryId=${item.id}`} onClick={() => showLoader()}>
                  <FileText className="mr-2 h-4 w-4" /> Create Quotation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPackagingOpen(true)}>
                <Printer className="mr-2 h-4 w-4" /> Print Thermal Packaging
              </DropdownMenuItem>
              <LabelPrintDialog
                 item={{
                    id: item.id,
                    sku: item.sku,
                    itemName: item.itemName,
                    internalName: item.internalName || "",
                    gemType: item.gemType || "",
                    color: item.colorCode?.name || "",
                    weightValue: item.weightValue || 0,
                    weightUnit: item.weightUnit || "",
                    weightRatti: item.weightRatti,
                    shape: item.shape,
                    dimensions: item.dimensionsMm,
                    stockLocation: item.stockLocation,
                    sellingPrice: sellingPrice,
                    pricingMode: item.pricingMode,
                    sellingRatePerCarat: item.sellingRatePerCarat
                 }}
                 trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Label
                    </DropdownMenuItem>
                 }
              />
            </>
          )}
          {(item.status === "RESERVED" || item.status === "MEMO") && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setStatusTarget("IN_STOCK");
                  setStatusReason("");
                  setStatusDialogOpen(true);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> Move to In Stock
              </DropdownMenuItem>
              {item.status !== "RESERVED" && (
                <DropdownMenuItem
                  onClick={() => {
                    setStatusTarget("RESERVED");
                    setStatusReason("");
                    setStatusDialogOpen(true);
                  }}
                >
                  <Lock className="mr-2 h-4 w-4" /> Mark as Reserved
                </DropdownMenuItem>
              )}
              {item.status !== "MEMO" && (
                <DropdownMenuItem
                  onClick={() => {
                    setStatusTarget("MEMO");
                    setStatusReason("");
                    setStatusDialogOpen(true);
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" /> Mark as Memo
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {packagingOpen && <PackagingPrintDialog open={packagingOpen} onOpenChange={setPackagingOpen} inventoryIds={[item.id]} initialMedium="THERMAL_50X25" />}

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent tone="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Update status for SKU <span className="font-mono">{item.sku}</span> to <span className="font-semibold">{statusTarget.replace("_", " ")}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-medium">Reason (optional)</div>
            <Textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Add a short reason for audit trail..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdatingStatus}
              onClick={async () => {
                setIsUpdatingStatus(true);
                try {
                  const fd = new FormData();
                  fd.append("inventoryId", item.id);
                  fd.append("status", statusTarget);
                  if (statusReason.trim()) fd.append("reason", statusReason.trim());
                  const res = await updateInventoryStatus(null, fd);
                  if (res && (res as unknown as { message?: string }).message && !(res as { success?: boolean }).success) {
                    toast.error((res as { message: string }).message);
                  } else {
                    toast.success("Status updated");
                    router.refresh();
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to update status");
                } finally {
                  setIsUpdatingStatus(false);
                  setStatusDialogOpen(false);
                }
              }}
            >
              {isUpdatingStatus ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
