import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Activity, Pencil } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileInventoryActions } from "@/components/inventory/mobile-inventory-actions";
import { ListingManager } from "@/components/inventory/listing-manager";
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { GciCertButton } from "@/components/inventory/gci-cert-button";
import type { Inventory, InventoryMedia } from "@prisma/client";

export const dynamic = "force-dynamic";

type InventoryWithExtras = Inventory & {
  category?: string | null;
  weightRatti?: number | null;
  certificates?: { name: string; remarks?: string | null }[];
};

type DetailedInventory = {
  id: string;
  sku: string;
  itemName: string;
  internalName?: string | null;
  category?: string | null;
  gemType?: string | null;
  description?: string | null;
  pieces?: number | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  carats?: number | null;
  weightRatti?: number | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  profit?: number | null;
  status: string;
  location?: string | null;
  certificateNo?: string | null;
  certification?: string | null;
  lab?: string | null;
  shape?: string | null;
  color?: string | null;
  clarity?: string | null;
  cut?: string | null;
  polish?: string | null;
  symmetry?: string | null;
  fluorescence?: string | null;
  measurements?: string | null;
  dimensionsMm?: string | null;
  tablePercent?: number | null;
  depthPercent?: number | null;
  ratio?: number | null;
  origin?: string | null;
  treatment?: string | null;
  transparency?: string | null;
  braceletType?: string | null;
  standardSize?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  holeSizeMm?: number | null;
  innerCircumferenceMm?: number | null;
  pricingMode: string;
  sellingRatePerCarat?: number | null;
  flatSellingPrice?: number | null;
  purchaseRatePerCarat?: number | null;
  flatPurchaseCost?: number | null;
  notes?: string | null;
  stockLocation?: string | null;
  purchaseId?: string | null;
  vendorId?: string | null;
  batchId?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  rapPrice?: number | null;
  discountPercent?: number | null;
  createdAt: Date;
  updatedAt: Date;
  media: InventoryMedia[];
  categoryCode?: { name: string; code?: string } | null;
  gemstoneCode?: { name: string; code?: string } | null;
  colorCode?: { name: string; code?: string } | null;
  collectionCode?: { name: string } | null;
  cutCode?: { name: string; code?: string } | null;
  rashis?: { name: string }[];
  certificates?: { name: string; remarks?: string | null }[];
};
type ActivityLogEntry = {
  id: string;
  actionType: string;
  userId: string | null;
  userName: string | null;
  entityType: string;
  entityId: string | null;
  entityIdentifier: string | null;
  details: string | null;
  fieldChanges: string | null;
  createdAt: Date;
  source: string | null;
};

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const rawItem = await prisma.inventory.findUnique({ where: { id } });
    const item = rawItem as InventoryWithExtras & { vendor?: { id: string; name: string } | null; media: InventoryMedia[] } | null;

    if (!item) return <div className="p-6">Inventory Item not found</div>;

  // We need to fetch related master codes names if they are not included.
  // Actually, we can just fetch them via Prisma include or separate queries.
  // Let's re-fetch with include to be safe and clean.
  let detailedItem: DetailedInventory | null;
  
  try {
      detailedItem = await prisma.inventory.findUnique({
        where: { id },
        include: {
            categoryCode: true,
            gemstoneCode: true,
            colorCode: true,
            collectionCode: true,
            cutCode: true,
            rashis: true,
            media: true,
            certificates: true
        }
      });
  } catch (error) {
      console.error("Detailed inventory fetch failed (strict mode), falling back to safe mode:", error);
      // Fallback: Select only known safe columns + media
      detailedItem = await prisma.inventory.findUnique({
          where: { id },
          select: {
            id: true, sku: true, itemName: true, internalName: true, category: true, gemType: true, description: true, pieces: true,
            weightValue: true, weightUnit: true, carats: true, weightRatti: true, costPrice: true, sellingPrice: true, profit: true,
            status: true, location: true, certificateNo: true, certification: true, lab: true, shape: true, color: true, clarity: true,
            cut: true, polish: true, symmetry: true, fluorescence: true, measurements: true, dimensionsMm: true, tablePercent: true,
            depthPercent: true, ratio: true, origin: true, treatment: true, transparency: true, braceletType: true, standardSize: true,
            beadSizeMm: true, beadCount: true, holeSizeMm: true, innerCircumferenceMm: true, pricingMode: true, sellingRatePerCarat: true,
            flatSellingPrice: true, purchaseRatePerCarat: true, flatPurchaseCost: true, notes: true, stockLocation: true, purchaseId: true,
            vendorId: true, batchId: true, imageUrl: true, videoUrl: true, rapPrice: true, discountPercent: true, createdAt: true, updatedAt: true,
            media: true,
            // Exclude relations that might cause crash
          }
      }) as DetailedInventory;
  }

  if (!detailedItem) return <div className="p-6">Inventory Item not found</div>;

  const vendor = detailedItem.vendorId 
    ? await prisma.vendor.findUnique({ where: { id: detailedItem.vendorId } })
    : null;

  let logs: ActivityLogEntry[] = [];
  try {
      logs = await prisma.activityLog.findMany({
        where: { entityType: "Inventory", entityId: id },
        orderBy: { createdAt: "desc" },
      }) as unknown as ActivityLogEntry[];
  } catch (error) {
    console.error("Failed to fetch activity logs for inventory:", error);
  }

  const lastEdit = logs.find((l) => l.actionType === "EDIT");
  
  // Calculate financials
  const weightVal = detailedItem.weightValue ?? 0;
  const purchaseCost = detailedItem.pricingMode === "PER_CARAT" 
      ? (detailedItem.purchaseRatePerCarat || 0) * weightVal 
      : (detailedItem.flatPurchaseCost || 0);
      
  const sellingPrice = detailedItem.pricingMode === "PER_CARAT"
      ? (detailedItem.sellingRatePerCarat || 0) * weightVal
      : (detailedItem.flatSellingPrice || 0);

  const profit = sellingPrice - purchaseCost;

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{detailedItem.itemName}</h1>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm text-muted-foreground font-mono">{detailedItem.sku} · {detailedItem.category}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Created {formatDistanceToNow(new Date(detailedItem.createdAt), { addSuffix: true })}</span>
                             {lastEdit && (
                                <span>Last edited {formatDistanceToNow(new Date(lastEdit.createdAt), { addSuffix: true })} by {lastEdit.userName || lastEdit.userId || "System"}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="hidden gap-2 md:flex">
                    <Button variant="outline" asChild>
                        <Link href={`/inventory/${id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/inventory">Back to Inventory</Link>
                    </Button>
                </div>
            </div>
            
            {/* Section 1: Media Gallery */}
            <div className="rounded-xl border bg-card p-6 shadow">
                <h2 className="text-lg font-semibold mb-4">Media Gallery</h2>
                {detailedItem.media.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {detailedItem.media.map((m: InventoryMedia, i: number) => (
                             <div key={m.id} className="relative h-48 w-48 shrink-0 rounded-lg border overflow-hidden">
                                 {m.type === 'image' || m.type === 'IMAGE' ? (
                                     <Image 
                                        src={m.mediaUrl} 
                                        alt={`Media ${i+1}`} 
                                        fill 
                                        className="object-cover"
                                     />
                                 ) : (
                                     <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                                         Video
                                     </div>
                                 )}
                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50 text-muted-foreground">
                        No media uploaded
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 {/* Section 2: Basic Information */}
                 <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow">
                    <h2 className="text-lg font-semibold border-b pb-2">Basic Information</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span> 
                            <span className="font-medium">{detailedItem.category}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Gem Type:</span> 
                            <span className="font-medium">{detailedItem.gemType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Color:</span> 
                            <span className="font-medium">{detailedItem.colorCode?.name || "-"}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Shape:</span> 
                            <span className="font-medium">{detailedItem.shape}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Collection:</span> 
                            <span className="font-medium">{detailedItem.collectionCode?.name || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Rashi:</span> 
                            <span className="font-medium">
                                {detailedItem.rashis && detailedItem.rashis.length > 0
                                    ? detailedItem.rashis.map((r: { name: string }) => r.name).join(", ")
                                    : "-"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Dimensions:</span> 
                            <span className="font-medium">{detailedItem.dimensionsMm || "-"}</span>
                        </div>
                        {(detailedItem.category === "Bracelets" || detailedItem.category === "Bracelet") && (
                            <>
                                <div className="border-t my-2"></div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bracelet Type:</span>
                                    <span className="font-medium">{detailedItem.braceletType || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bead Size:</span>
                                    <span className="font-medium">{detailedItem.beadSizeMm ? `${detailedItem.beadSizeMm}mm` : "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Standard Size:</span>
                                    <span className="font-medium">{detailedItem.standardSize || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bead Count:</span>
                                    <span className="font-medium">{detailedItem.beadCount || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Inner Circ.:</span>
                                    <span className="font-medium">{detailedItem.innerCircumferenceMm ? `${detailedItem.innerCircumferenceMm}mm` : "-"}</span>
                                </div>
                            </>
                        )}
                    </div>
                 </div>

                 {/* Section 3: Weight Information */}
                 <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow">
                    <h2 className="text-lg font-semibold border-b pb-2">Weight Information</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight:</span> 
                            <span className="font-medium text-lg">{detailedItem.weightValue} {detailedItem.weightUnit}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ratti (calc):</span> 
                            <span className="font-medium">{detailedItem.weightRatti}</span>
                        </div>
                         <div className="flex justify-between pt-2">
                             <span className="text-muted-foreground">Treatment:</span>
                             <span className="font-medium">{detailedItem.treatment || "None"}</span>
                         </div>
                         <div className="flex justify-between items-start">
                             <span className="text-muted-foreground pt-1">Certification:</span>
                             <div className="flex flex-col items-end w-1/2">
                                 <span className="font-medium text-right">
                                    {detailedItem.certificates && detailedItem.certificates.length > 0 
                                        ? detailedItem.certificates
                                            .map((c: { name: string; remarks?: string | null }) => c.remarks ? `${c.name} (${c.remarks})` : c.name)
                                            .join(", ") 
                                         : (detailedItem.certification || "None")}
                                 </span>
                                 <GciCertButton 
                                     inventoryId={detailedItem.id}
                                     certificateNo={detailedItem.certificateNo}
                                     lab={detailedItem.lab}
                                     certificationUrl={detailedItem.certification}
                                 />
                             </div>
                         </div>
                    </div>
                 </div>
                 
                 {/* Section 4: Pricing & Commercial */}
                 <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow">
                    <h2 className="text-lg font-semibold border-b pb-2">Commercial Details</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pricing Mode:</span> 
                            <Badge variant="outline">{detailedItem.pricingMode}</Badge>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Purchase Rate:</span> 
                            <span className="font-medium">
                                {detailedItem.pricingMode === 'PER_CARAT' 
                                    ? formatCurrency(detailedItem.purchaseRatePerCarat || 0) + '/ct' 
                                    : 'Flat Rate'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Purchase Cost:</span> 
                            <span className="font-medium">{formatCurrency(purchaseCost)}</span>
                        </div>
                        <div className="border-t my-2"></div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Selling Rate:</span> 
                            <span className="font-medium">
                                {detailedItem.pricingMode === 'PER_CARAT' 
                                    ? formatCurrency(detailedItem.sellingRatePerCarat || 0) + '/ct' 
                                    : 'Flat Rate'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Selling Price:</span> 
                            <span className="font-bold text-lg">{formatCurrency(sellingPrice)}</span>
                        </div>
                        <div className="flex justify-between bg-green-50 p-2 rounded text-green-700">
                            <span className="font-medium">Profit Potential:</span> 
                            <span className="font-bold">{formatCurrency(profit)}</span>
                        </div>
                    </div>
                 </div>

                 {/* Section 5: Source & Inventory Control */}
                  <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow md:col-span-2 lg:col-span-1">
                    <h2 className="text-lg font-semibold border-b pb-2">Source & Control</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Vendor:</span> 
                            {detailedItem.vendorId ? (
                              <Link href={`/vendors/${detailedItem.vendorId}`} className="font-medium text-blue-600 hover:underline">
                                  {vendor?.name || "Unknown Vendor"}
                              </Link>
                            ) : (
                              <span className="font-medium">{vendor?.name || "Unknown Vendor"}</span>
                            )}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Stock Location:</span> 
                            <span className="font-medium">{detailedItem.stockLocation || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status:</span> 
                            <Badge variant={detailedItem.status === 'IN_STOCK' ? 'default' : 'secondary'}>
                                {detailedItem.status.replace("_", " ")}
                            </Badge>
                        </div>
                    </div>
                 </div>
                 
                 {/* Notes Section */}
                 {detailedItem.notes && (
                    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow md:col-span-2">
                        <h2 className="text-lg font-semibold border-b pb-2">Notes & Remarks</h2>
                        <div className="text-sm whitespace-pre-line bg-muted/30 p-4 rounded-lg">
                            {detailedItem.notes}
                        </div>
                    </div>
                 )}
            </div>

            {/* Section 6: Activity Timeline */}
             <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="border-b px-6 py-4 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Activity Timeline</h2>
                </div>
                <div className="p-6 space-y-6">
                    {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity recorded.</p>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-4 relative">
                                {/* Line connecting dots */}
                                <div className="absolute left-[9px] top-8 bottom-[-24px] w-0.5 bg-border last:hidden"></div>
                                
                                <div className={`mt-1.5 h-5 w-5 rounded-full shrink-0 flex items-center justify-center z-10 ${
                                    log.actionType === 'CREATE' ? 'bg-green-100 text-green-600' :
                                    log.actionType === 'EDIT' ? 'bg-blue-100 text-blue-600' :
                                    log.actionType === 'DELETE' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    <div className={`h-2 w-2 rounded-full ${
                                        log.actionType === 'CREATE' ? 'bg-green-600' :
                                        log.actionType === 'EDIT' ? 'bg-blue-600' :
                                        log.actionType === 'DELETE' ? 'bg-red-600' : 'bg-gray-600'
                                    }`} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        {log.userName || log.userId || "System"} <span className="font-normal text-muted-foreground">{log.actionType.toLowerCase()}d this item</span>
                                        {log.source !== 'WEB' && <Badge variant="outline" className="ml-2 text-[10px] h-5">{log.source}</Badge>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(log.createdAt).toLocaleString()} ({formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })})
                                    </p>
                                    {log.fieldChanges && (
                                        <div className="text-xs bg-muted/50 p-2 rounded mt-2 font-mono border">
                                            <span className="font-semibold text-muted-foreground">Changes: </span>
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(log.fieldChanges);
                                                    return Object.keys(parsed).join(", ");
                                                } catch {
                                                    return "Unparsable changes";
                                                }
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow md:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-lg font-semibold">Listings & Platforms</h2>
                    <LabelPrintDialog 
                        item={{
                            id: detailedItem.id,
                            sku: detailedItem.sku,
                            itemName: detailedItem.itemName,
                            internalName: detailedItem.internalName || undefined,
                            gemType: detailedItem.gemType || "",
                            color: detailedItem.colorCode?.name || "",
                            weightValue: detailedItem.weightValue || 0,
                            weightUnit: detailedItem.weightUnit || "",
                            weightRatti: detailedItem.weightRatti,
                            sellingPrice: sellingPrice,
                            pricingMode: detailedItem.pricingMode,
                            sellingRatePerCarat: detailedItem.sellingRatePerCarat
                        }}
                        trigger={<Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" /> Print Label</Button>}
                    />
                </div>
                <div className="pt-2">
                    <ListingManager inventoryId={id} sku={detailedItem.sku} />
                </div>
            </div>

            <MobileInventoryActions id={id} status={detailedItem.status} />
        </div>
    );
  } catch (error) {
    console.error("Inventory detail render error:", error);
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Unable to render Inventory Detail</strong>
          <span className="block sm:inline"> Please try again. If the issue persists, the item’s data may be missing optional relations. We’ve logged the error.</span>
        </div>
      </div>
    );
  }
}
