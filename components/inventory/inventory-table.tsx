/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryActions } from "@/components/inventory/inventory-actions";
import { InventoryCardMedia } from "@/components/inventory/inventory-card-media";
import { formatDate } from "@/lib/utils";
import { formatInrNumber } from "@/lib/number-formatting";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { BulkCertificateDialog } from "./bulk-certificate-dialog";
import { Edit, ShieldCheck } from "lucide-react";
import { InventoryDetailDrawer } from "@/components/inventory/inventory-detail-drawer";
import { RegenerateEbayButton } from "./regenerate-ebay-button";

interface InventoryTableProps {
  data: any[];
  vendors: any[];
  categories: any[];
  gemstones: any[];
  colors: any[];
  rashis: any[];
  certificates: any[];
  collections: any[];
  cuts?: any[];
  origins?: string[];
  canManageAttentionVisibility: boolean;
}

export function InventoryTable({
  data,
  vendors,
  categories,
  gemstones,
  colors,
  rashis,
  certificates,
  collections,
  cuts = [],
  origins = [],
  canManageAttentionVisibility,
}: InventoryTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [isBulkCertificateDialogOpen, setIsBulkCertificateDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerCache] = useState(() => new Map<string, any>());

  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [vendors]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const selectedSummary = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const selected = data.filter((d) => selectedIds.includes(d.id));
    const total = selected.reduce((acc, item) => {
      const price =
        item.pricingMode === "PER_CARAT"
          ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
          : item.pricingMode === "PER_RATTI"
          ? (item.sellingRatePerCarat || 0) * (item.weightRatti || 0)
          : item.flatSellingPrice || 0;
      return acc + Number(price || 0);
    }, 0);
    const avg = selected.length ? total / selected.length : 0;
    return { count: selected.length, total, avg };
  }, [data, selectedIds]);

  const openDrawer = (id: string) => {
    setDrawerId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-md">
          <span className="text-sm font-medium ml-2">
            {selectedIds.length} selected
            {selectedSummary ? (
              <span className="ml-2 text-xs text-muted-foreground">
                | ₹{formatInrNumber(selectedSummary.total, 0)} total | Avg ₹{formatInrNumber(selectedSummary.avg, 0)}
              </span>
            ) : null}
          </span>
          <RegenerateEbayButton selectedItemIds={selectedIds} />
          <Button size="sm" onClick={() => {
            const params = new URLSearchParams();
            selectedIds.forEach(id => params.append('id', id));
            router.push(`/inventory/bulk-edit?${params.toString()}`);
          }}>
            <Edit className="mr-2 h-4 w-4" />
            Bulk Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsBulkEditDialogOpen(true)}>
            Quick Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsBulkCertificateDialogOpen(true)}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Bulk Certificates
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear Selection
          </Button>
        </div>
      )}

      <div className="rounded-md border hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-15">Image</TableHead>
              <TableHead className="w-25">SKU</TableHead>
              <TableHead className="min-w-50">Item Name</TableHead>
              <TableHead className="w-25">Category</TableHead>
              <TableHead className="w-25">Type</TableHead>
              <TableHead className="w-20">Color</TableHead>
              <TableHead className="w-20">Cut</TableHead>
              <TableHead className="w-25">Weight</TableHead>
              <TableHead className="w-37.5">Certificates</TableHead>
              <TableHead className="w-20">Ratti</TableHead>
              <TableHead className="w-25">Price</TableHead>
              <TableHead className="w-25">Status</TableHead>
              <TableHead className="w-25">Vendor</TableHead>
              <TableHead className="w-25">Location</TableHead>
              <TableHead className="w-25">Date Added</TableHead>
              <TableHead className="w-15 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="h-24 text-center">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const price =
                  item.pricingMode === "PER_CARAT"
                    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                    : item.pricingMode === "PER_RATTI"
                    ? (item.sellingRatePerCarat || 0) * (item.weightRatti || 0)
                    : item.flatSellingPrice || 0;
                
                return (
                    <TableRow
                      key={item.id}
                      data-state={selectedIds.includes(item.id) ? "selected" : undefined}
                      className="h-14 hover:bg-muted/20"
                    >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                        aria-label={`Select ${item.sku}`}
                      />
                    </TableCell>
                    <TableCell>
                      <InventoryCardMedia item={item} className="h-12 w-12" />
                    </TableCell>
                    <TableCell className="font-medium font-mono text-xs">
                      <button type="button" className="cursor-pointer hover:underline" onClick={() => openDrawer(item.id)}>
                        {item.sku}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <button type="button" className="text-left hover:underline font-medium" onClick={() => openDrawer(item.id)}>
                          {item.itemName}
                        </button>
                        {item.internalName && (
                          <span className="text-xs text-muted-foreground">
                            {item.internalName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.gemType}</span>
                        {(item.category === "Bracelets" || item.category === "Bracelet") && (
                          <span className="text-[10px] text-muted-foreground">
                            {[
                                item.braceletType,
                                item.standardSize,
                                item.beadSizeMm ? `${item.beadSizeMm}mm` : null
                            ].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.colorCode?.name || "-"}</TableCell>
                    <TableCell>{item.cutCode?.name || "-"}</TableCell>
                    <TableCell>
                      {item.weightValue} {item.weightUnit}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const rawCert = String(item.certification || "").trim();
                        const certUrl = /^https?:\/\//i.test(rawCert) ? rawCert : null;
                        const providerFromCodes = item.certificates?.[0]?.name ? String(item.certificates[0].name) : "";
                        const hasCertNo = !!(item.certificateNo && String(item.certificateNo).trim());
                        const hasCertNum = !!(item.certificateNumber && String(item.certificateNumber).trim());

                        if (!hasCertNo && !hasCertNum && !certUrl) return <span className="text-amber-600">— ⚠</span>;

                        const provider = providerFromCodes || String((item as any).lab || (item as any).certificateLab || "") || "GCI";

                        return (
                          <div className="flex flex-col gap-1">
                            <div className="text-foreground">{provider} ✓</div>
                            {certUrl ? (
                              <a
                                href={certUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary underline"
                              >
                                View certificate
                              </a>
                            ) : null}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {item.weightRatti ? item.weightRatti.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">₹{formatInrNumber(Number(price || 0), 0)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "IN_STOCK"
                            ? "default"
                            : item.status === "SOLD"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          item.status === "RESERVED"
                            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                            : item.status === "MEMO"
                            ? "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200"
                            : item.status === "IN_STOCK"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                            : undefined
                        }
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(item.vendorId && vendorMap.get(item.vendorId)) || "-"}</TableCell>
                    <TableCell className="text-xs">{item.stockLocation || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <InventoryActions item={item} canManageAttentionVisibility={canManageAttentionVisibility} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InventoryDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        inventoryId={drawerId}
        getCached={(id) => drawerCache.get(id)}
        setCached={(id, value) => drawerCache.set(id, value)}
      />

      <BulkEditDialog 
        selectedIds={selectedIds}
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        onSuccess={() => setSelectedIds([])}
        categories={categories}
        gemstones={gemstones}
        colors={colors}
        rashis={rashis}
        certificates={certificates}
        vendors={vendors}
        collections={collections}
        cuts={cuts}
        origins={origins}
      />
      <BulkCertificateDialog
        selectedIds={selectedIds}
        open={isBulkCertificateDialogOpen}
        onOpenChange={setIsBulkCertificateDialogOpen}
        onSuccess={() => setSelectedIds([])}
      />
    </div>
  );
}
