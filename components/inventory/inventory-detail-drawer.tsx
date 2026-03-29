"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { formatInrCurrency, formatInrNumber } from "@/lib/number-formatting";

type DrawerMedia = { id: string; type: string; mediaUrl: string; isPrimary: boolean };
type DrawerItem = {
  id: string;
  sku: string;
  itemName: string;
  internalName?: string | null;
  status: string;
  category?: string | null;
  gemType?: string | null;
  shape?: string | null;
  color?: string | null;
  cut?: string | null;
  transparency?: string | null;
  treatment?: string | null;
  origin?: string | null;
  fluorescence?: string | null;
  weightValue?: number | null;
  weightUnit?: string | null;
  weightRatti?: number | null;
  dimensionsMm?: string | null;
  beadSizeMm?: number | null;
  beadCount?: number | null;
  innerCircumferenceMm?: number | null;
  pricingMode?: string | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
  vendor?: { id: string; name: string } | null;
  stockLocation?: string | null;
  certificates?: Array<{ name: string; remarks?: string | null }>;
  certificateNumber?: string | null;
  certificateUrl?: string | null;
  collection?: string | null;
  rashis?: string[];
  notes?: string | null;
  additionalDetails?: string | null;
  certificateComments?: string | null;
  createdAt?: string;
  updatedAt?: string;
  media?: DrawerMedia[];
};

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();
  if (s === "IN_STOCK") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">In Stock</Badge>;
  if (s === "SOLD") return <Badge variant="secondary">Sold</Badge>;
  if (s === "RESERVED") return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Reserved</Badge>;
  if (s === "MEMO") return <Badge className="bg-violet-600 text-white hover:bg-violet-600">Memo</Badge>;
  return <Badge variant="outline">{s.replaceAll("_", " ") || "UNKNOWN"}</Badge>;
}

export function InventoryDetailDrawer({
  open,
  onOpenChange,
  inventoryId,
  getCached,
  setCached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string | null;
  getCached: (id: string) => DrawerItem | undefined;
  setCached: (id: string, value: DrawerItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DrawerItem | null>(null);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!inventoryId) return;

    const cached = getCached(inventoryId);
    if (cached) {
      setData(cached);
      const first = cached.media?.find((m) => m.isPrimary)?.mediaUrl || cached.media?.[0]?.mediaUrl || null;
      setActiveMedia(first);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setActiveMedia(null);
    lastIdRef.current = inventoryId;

    fetch(`/api/inventory/${encodeURIComponent(inventoryId)}/drawer`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed");
        return (await r.json()) as DrawerItem;
      })
      .then((json) => {
        if (lastIdRef.current !== inventoryId) return;
        setCached(inventoryId, json);
        setData(json);
        const first = json.media?.find((m) => m.isPrimary)?.mediaUrl || json.media?.[0]?.mediaUrl || null;
        setActiveMedia(first);
      })
      .catch(() => {})
      .finally(() => {
        if (lastIdRef.current !== inventoryId) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [open, inventoryId, getCached, setCached]);

  const media = useMemo(() => data?.media || [], [data]);
  const mainImage = activeMedia || media.find((m) => m.isPrimary)?.mediaUrl || media[0]?.mediaUrl || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[40vw] max-w-none min-w-[420px] p-0">
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base">
                <span className="font-mono">{data?.sku || "—"}</span>
              </SheetTitle>
              <div className="mt-1 text-sm text-muted-foreground truncate">{data?.itemName || ""}</div>
            </div>
            <div className="shrink-0">{data?.status ? statusBadge(data.status) : null}</div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            <div className="space-y-3">
              <div className="text-sm font-semibold">Images</div>
              {loading ? (
                <div className="grid grid-cols-1 gap-3">
                  <Skeleton className="h-[260px] w-full rounded-md" />
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-md" />
                    ))}
                  </div>
                </div>
              ) : mainImage ? (
                <div className="space-y-3">
                  <div className="relative w-full h-[260px] rounded-md overflow-hidden bg-muted">
                    <Image src={mainImage} alt={data?.sku || "Inventory"} fill className="object-cover" />
                  </div>
                  {media.length > 1 ? (
                    <div className="grid grid-cols-5 gap-2">
                      {media
                        .filter((m) => m.type !== "VIDEO")
                        .slice(0, 10)
                        .map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`relative h-14 rounded-md overflow-hidden border ${activeMedia === m.mediaUrl ? "border-primary" : "border-border"}`}
                            onClick={() => setActiveMedia(m.mediaUrl)}
                          >
                            <Image src={m.mediaUrl} alt={m.id} fill className="object-cover" />
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
                  No Image उपलब्ध
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Key Information</div>
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Category</div>
                    <div className="text-sm mt-1">{data?.category || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Gem Type</div>
                    <div className="text-sm mt-1">{data?.gemType || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Shape</div>
                    <div className="text-sm mt-1">{data?.shape || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Color</div>
                    <div className="text-sm mt-1">{data?.color || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Cut</div>
                    <div className="text-sm mt-1">{data?.cut || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Transparency</div>
                    <div className="text-sm mt-1">{data?.transparency || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Treatment</div>
                    <div className="text-sm mt-1">{data?.treatment || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Origin</div>
                    <div className="text-sm mt-1">{data?.origin || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Fluorescence</div>
                    <div className="text-sm mt-1">{data?.fluorescence || "—"}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Weight</div>
                    <div className="text-sm mt-1">
                      {data?.weightValue != null ? `${formatInrNumber(Number(data.weightValue), 2)} ${data?.weightUnit || ""}` : "—"}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Ratti</div>
                    <div className="text-sm mt-1">
                      {data?.weightRatti != null ? formatInrNumber(Number(data.weightRatti), 2) : "—"}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] text-muted-foreground">Dimensions</div>
                    <div className="text-sm mt-1">{data?.dimensionsMm || "—"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Pricing & Source</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Purchase Price</div>
                  <div className="text-sm mt-1">{data?.costPrice != null ? formatInrCurrency(Number(data.costPrice)) : "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Selling Price</div>
                  <div className="text-sm mt-1">{data?.sellingPrice != null ? formatInrCurrency(Number(data.sellingPrice)) : "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Vendor</div>
                  <div className="text-sm mt-1">{data?.vendor?.name || "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Location</div>
                  <div className="text-sm mt-1">{data?.stockLocation || "—"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Certification</div>
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm">
                  {data?.certificates?.length
                    ? data.certificates.map((c) => (c.remarks ? `${c.name} (${c.remarks})` : c.name)).join(", ")
                    : "—"}
                </div>
                {data?.certificateNumber ? (
                  <div className="text-xs text-muted-foreground">Certificate #: {data.certificateNumber}</div>
                ) : null}
                {data?.certificateUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={data.certificateUrl} target="_blank">
                      View Certificate
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Classification</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Collection</div>
                  <div className="text-sm mt-1">{data?.collection || "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Rashi</div>
                  <div className="text-sm mt-1">{data?.rashis?.length ? data.rashis.join(", ") : "—"}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Notes</div>
              <div className="rounded-md border p-3 space-y-3">
                {data?.notes ? <div className="text-sm whitespace-pre-wrap">{data.notes}</div> : <div className="text-sm text-muted-foreground">—</div>}
                {data?.additionalDetails ? (
                  <div className="text-sm whitespace-pre-wrap">{data.additionalDetails}</div>
                ) : null}
                {data?.certificateComments ? (
                  <div className="text-sm whitespace-pre-wrap">{data.certificateComments}</div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Timeline</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Date Added</div>
                  <div className="text-sm mt-1">{data?.createdAt ? formatDate(new Date(data.createdAt)) : "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground">Last Updated</div>
                  <div className="text-sm mt-1">{data?.updatedAt ? formatDate(new Date(data.updatedAt)) : "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t">
          <div className="flex items-center justify-between gap-2">
            {data?.id ? (
              <Button asChild variant="outline">
                <Link href={`/inventory/${data.id}/edit`}>Edit Item</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Edit Item
              </Button>
            )}
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

