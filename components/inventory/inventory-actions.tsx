"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, MoreHorizontal, Pencil, IndianRupee, FileText, Globe, Printer, EyeOff, EyeIcon, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryQrDialog } from "./inventory-qr";
import { ListingManager } from "./listing-manager";
import { LabelPrintDialog } from "./label-print-dialog";
import { toast } from "sonner";
import { updateInventoryStatus } from "@/app/(dashboard)/inventory/actions";
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
    hideFromAttention?: boolean | null;
  };
  canManageAttentionVisibility: boolean;
}

export function InventoryActions({ item, canManageAttentionVisibility }: InventoryActionsProps) {
  const router = useRouter();
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<"IN_STOCK" | "RESERVED" | "MEMO">("RESERVED");
  const [statusReason, setStatusReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const sellingPrice = item.pricingMode === "PER_CARAT"
    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
    : item.flatSellingPrice || 0;
  const isHiddenFromAttention = Boolean(item.hideFromAttention);

  const toggleAttentionVisibility = async () => {
    if (!canManageAttentionVisibility || isUpdatingVisibility) return;
    setIsUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/inventory/${item.id}/attention-visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideFromAttention: !isHiddenFromAttention }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update SKU attention visibility");
      }
      localStorage.setItem("attention-visibility-last-change", Date.now().toString());
      window.dispatchEvent(new Event("attention-visibility-changed"));
      toast.success(
        result.hideFromAttention
          ? `${item.sku} hidden from attention widget`
          : `${item.sku} visible in attention widget`
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update SKU attention visibility");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
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
            <Link href={`/inventory/${item.id}`}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>
              {canManageAttentionVisibility && (
                <DropdownMenuItem onClick={toggleAttentionVisibility} disabled={isUpdatingVisibility}>
                  {isHiddenFromAttention ? (
                    <EyeIcon className="mr-2 h-4 w-4" />
                  ) : (
                    <EyeOff className="mr-2 h-4 w-4" />
                  )}
                  {isUpdatingVisibility
                    ? "Updating..."
                    : isHiddenFromAttention
                    ? "Show In Attention Widget"
                    : "Hide From Attention Widget"}
                </DropdownMenuItem>
              )}
          {item.status === "IN_STOCK" && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/inventory/${item.id}/edit`}>
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
                <Link href={`/sales/new?inventoryId=${item.id}`}>
                  <IndianRupee className="mr-2 h-4 w-4" /> Mark as Sold
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/quotes/new?inventoryId=${item.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> Create Quotation
                </Link>
              </DropdownMenuItem>
              <ListingManager 
                  inventoryId={item.id} 
                  sku={item.sku} 
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Globe className="mr-2 h-4 w-4" /> Manage Listings
                    </DropdownMenuItem>
                  } 
              />
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

      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
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
