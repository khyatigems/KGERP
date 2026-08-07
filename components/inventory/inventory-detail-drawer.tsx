"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { formatInrCurrency, formatInrNumber } from "@/lib/number-formatting";
import { generateInfographicPng, type InfographicTheme, type InfographicSize, INFOGRAPHIC_SIZES, INFOGRAPHIC_BACKGROUNDS } from "@/lib/infographic-generator";
import { InfographicTemplate } from "@/components/inventory/infographic-template";
import { Download, ChevronDown } from "lucide-react";
import { useGlobalLoader } from "@/components/global-loader-provider";

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
  certificateLab?: string | null;
  certificateUrl?: string | null;
  collection?: string | null;
  rashis?: string[];
  notes?: string | null;
  additionalDetails?: string | null;
  certificateComments?: string | null;
  companyBranding?: { logoUrl?: string | null; companyName?: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
  media?: DrawerMedia[];
  activityLogs?: Array<{
    id: string;
    actionType: string;
    details: string | null;
    userName: string | null;
    createdAt: string;
  }>;
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
  const [infographicTheme, setInfographicTheme] = useState<InfographicTheme>("dark");
  const [infographicSize, setInfographicSize] = useState<InfographicSize>(INFOGRAPHIC_SIZES[0]);
  const [infographicBackground, setInfographicBackground] = useState("none");
  const [generatingInfographic, setGeneratingInfographic] = useState(false);
  const infographicRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const { showLoader } = useGlobalLoader();

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

  const handleDownloadInfographic = useCallback(
    async (theme: InfographicTheme) => {
      if (!infographicRef.current || !data) return;
      setInfographicTheme(theme);
      setGeneratingInfographic(true);
      try {
        await new Promise((r) => setTimeout(r, 100));
        await generateInfographicPng(infographicRef.current, data.sku, theme, infographicSize);
      } catch (err) {
        console.error("Failed to generate infographic:", err);
      } finally {
        setGeneratingInfographic(false);
      }
    },
    [data, infographicSize]
  );

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
                    <Image src={mainImage} alt={data?.sku || "Inventory"} fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" />
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
                            <Image src={m.mediaUrl} alt={m.id} fill sizes="56px" className="object-cover" />
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
              {(data?.activityLogs && data.activityLogs.length > 0) && (
                <div className="space-y-2 mt-2">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Activity</div>
                  <div className="space-y-2">
                    {data.activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 rounded-md border p-2 text-xs">
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                          log.actionType === "CREATE" || log.actionType === "LABEL_PRINT" ? "bg-emerald-500" :
                          log.actionType === "STATUS_CHANGE" ? "bg-amber-500" :
                           log.actionType === "EDIT" ? "bg-primary" :
                          "bg-gray-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground">{log.details || log.actionType}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {log.userName && <span>{log.userName}</span>}
                            <span>·</span>
                            <span>{formatDate(new Date(log.createdAt))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t">
          <div className="flex items-center justify-between gap-2">
            {data?.id ? (
              <Button asChild variant="outline">
                <Link href={`/inventory/${data.id}/edit`} onClick={() => showLoader()}>Edit Item</Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Edit Item
              </Button>
            )}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data || generatingInfographic}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {generatingInfographic ? "Generating..." : "Download"}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Size</DropdownMenuLabel>
                  {INFOGRAPHIC_SIZES.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => setInfographicSize(s)}
                      className={infographicSize.id === s.id ? "bg-accent" : ""}
                    >
                      {s.label}
                      <span className="ml-auto text-xs text-muted-foreground">{s.width}×{s.height}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Background</DropdownMenuLabel>
                  {INFOGRAPHIC_BACKGROUNDS.map((bg) => (
                    <DropdownMenuItem
                      key={bg.id}
                      onClick={() => setInfographicBackground(bg.id)}
                      className={infographicBackground === bg.id ? "bg-accent" : ""}
                    >
                      {bg.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleDownloadInfographic("dark")}>
                    Dark Theme
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadInfographic("light")}>
                    Light Theme
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>

      {/* Hidden infographic template for image generation */}
      {data && (
        <div
          style={{
            position: "fixed",
            left: -9999,
            top: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <div ref={infographicRef}>
            <InfographicTemplate
              data={{
                sku: data.sku,
                itemName: data.itemName,
                image: mainImage,
                category: data.category,
                gemType: data.gemType,
                shape: data.shape,
                color: data.color,
                cut: data.cut,
                transparency: data.transparency,
                treatment: data.treatment,
                origin: data.origin,
                weightValue: data.weightValue,
                weightUnit: data.weightUnit,
                weightRatti: data.weightRatti,
                dimensionsMm: data.dimensionsMm,
                certifications: data.certificates?.map((c) => c.name) || [],
                certificateLab: data.certificateLab || null,
                logoUrl: data.companyBranding?.logoUrl || null,
                companyName: data.companyBranding?.companyName || "KhyatiGems",
              }}
              theme={infographicTheme}
              size={infographicSize}
              background={infographicBackground}
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}

