"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkContext } from "@/lib/work-tracker/browser-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EtsyBulkDrafts } from "./etsy-bulk-drafts";
import { EbayBulkReview } from "@/components/marketplace/ebay-bulk-review";
import { EbayCompleteReview } from "@/components/marketplace/ebay-complete-review";
export type SavedDraft = {
  skuSynced?: boolean;
  sellerHubDraft?: { state: string; taskId: string | null; draftId: string | null; completeUrl: string | null } | null;
  shopId: string | null;
  id: string;
  externalId?: string | null;
  sku: string;
  itemName: string;
  title: string;
  shop: string;
  platform: string;
  syncError?: string | null;
  price: number;
  currency: string;
  regionalPrices?: { india: number; us: number; global: number } | null;
  updatedAt: string;
};
export function MarketplaceDraftsClient({ drafts }: { drafts: SavedDraft[] }) {
 const router = useRouter();
 const [bulkMode, setBulkMode] = useState(false);
 const [bulkMarketplace, setBulkMarketplace] = useState("EBAY");
 const [bulkRunning, setBulkRunning] = useState(false);
 const [syncedSkuIds, setSyncedSkuIds] = useState<string[]>([]);
 const [busy, setBusy] = useState(false);
 const [offerChecks, setOfferChecks] = useState<Record<string, string>>({});
 const [checkingOfferId, setCheckingOfferId] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [platform, setPlatform] = useState("ALL");
 const [activeDraft, setActiveDraft] = useState<SavedDraft | null>(null);
 const workPlatform = bulkMode ? bulkMarketplace : activeDraft?.platform || platform;
 useWorkContext({ platform: workPlatform === "EBAY" || workPlatform === "ETSY" ? workPlatform : "ERP", activityType: "LISTING_CREATION", marketplaceShopId: bulkMode ? null : activeDraft?.shopId || null, listingRecordId: bulkMode ? null : activeDraft?.id || null, label: activeDraft?.sku || "Marketplace drafts" });
 const visibleDrafts = drafts.filter((draft) => (platform === "ALL" || draft.platform === platform) && `${draft.sku} ${draft.title} ${draft.shop}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-semibold">Marketplace Drafts</h1><p className="mt-1 text-sm text-muted-foreground">Review saved eBay and Etsy drafts, resolve warnings and continue listing.</p></div><div className="flex gap-2"><Button type="button" variant={bulkMode ? "default" : "outline"} aria-pressed={bulkMode} disabled={bulkRunning || busy} onClick={() => setBulkMode((value) => !value)}>{bulkMode ? "Exit bulk mode" : "Bulk mode"}</Button><Button asChild><Link href="/marketplace-create-listings" onClick={(event) => { if (bulkRunning) event.preventDefault(); }} aria-disabled={bulkRunning}>Create listing</Link></Button></div></div>
   <div className="flex flex-wrap gap-3"><Input className="sm:max-w-sm" disabled={bulkRunning} aria-label="Search drafts" placeholder="Search SKU, title or shop" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="rounded-md border bg-background px-3 py-2 text-sm" disabled={bulkRunning} aria-label="Filter drafts by marketplace" value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="ALL">All marketplaces</option><option value="EBAY">eBay</option><option value="ETSY">Etsy</option></select><span className="self-center text-sm text-muted-foreground">{visibleDrafts.length} of {drafts.length} drafts</span></div>
          <div>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Saved drafts <span className="text-sm font-normal text-muted-foreground">({drafts.length})</span></CardTitle>
                <CardDescription>Review and publish eBay offers, or repair saved Etsy draft details. Expand a draft to see its actions.</CardDescription>
              </div>

            </CardHeader>
            <CardContent>
              {bulkMode ? <div className="space-y-4">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4"><h2 className="font-semibold">Bulk mode</h2><p className="mt-1 text-sm text-muted-foreground">Choose a marketplace, select the products and run one batch action. Review each item’s result before switching marketplaces or exiting bulk mode.</p><div className="mt-3 flex gap-2">{["EBAY", "ETSY"].map((value) => <Button key={value} type="button" aria-pressed={bulkMarketplace === value} variant={bulkMarketplace === value ? "default" : "outline"} disabled={bulkRunning} onClick={() => { setBulkMarketplace(value); setPlatform("ALL"); }}>{value === "EBAY" ? "eBay" : "Etsy"}</Button>)}</div></div>
                {bulkMarketplace === "EBAY" ? (visibleDrafts.some((draft) => draft.platform === "EBAY") ? <EbayBulkReview drafts={visibleDrafts} onRunning={setBulkRunning} /> : <p>No eBay drafts match the current filter.</p>) : <EtsyBulkDrafts drafts={visibleDrafts} onRunning={setBulkRunning} />}
              </div> : <>

              {visibleDrafts.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                  <p className="text-sm font-medium">No matching marketplace drafts</p>
                  <p className="mt-1 text-xs text-muted-foreground">Create a listing or adjust your search and marketplace filter.</p>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-xs text-muted-foreground">Open confirmed drafts in the selected marketplace shop to review and publish.</p>
                  <div className="divide-y rounded-lg border">
                  {visibleDrafts.map((draft) => (
                    <details key={draft.id} className="group min-w-0" onPointerDown={() => setActiveDraft(draft)} onFocusCapture={() => setActiveDraft(draft)}>
                      <summary className="cursor-pointer px-4 py-3 text-sm marker:text-muted-foreground">
                        <span className="font-medium break-words">{draft.title}</span>
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{draft.platform}</span>
                        {draft.platform === "ETSY" && (draft.skuSynced || syncedSkuIds.includes(draft.id)) && <p className="mt-2 text-xs text-emerald-600">SKU synced to Etsy</p>}
                        {draft.syncError && <span className="ml-2 text-xs text-amber-700">Needs attention</span>}
                        <span className="mt-1 block break-words text-xs text-muted-foreground">{draft.sku} · {draft.shop} · {draft.currency} {draft.price.toFixed(2)}</span>
                      </summary>
                      <div className="flex flex-wrap items-start justify-between gap-3 border-t bg-muted/10 px-4 py-3 text-sm">

                      <div className="min-w-0 flex-1">
                        {draft.externalId
                          ? <p className="mt-1 text-[10px] text-muted-foreground">{draft.platform === "EBAY" ? "eBay API offer ID" : "Etsy draft listing ID"} · {draft.externalId}</p>
                          : !draft.sellerHubDraft?.taskId && <p className="mt-1 text-[10px] text-amber-700">ERP draft · review complete listing to check its eBay offer</p>}
                        {draft.platform === "ETSY" && draft.externalId && draft.shopId && !draft.skuSynced && !syncedSkuIds.includes(draft.id) && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={async () => {
                          setBusy(true);
                          try {
                            const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "repairEtsySku", draftId: draft.id, shopId: draft.shopId }) });
                            const payload = await response.json();
                            if (!response.ok) throw new Error(payload.error || "SKU sync failed.");
                            setSyncedSkuIds((previous) => [...previous, draft.id]);
                            toast.success(`SKU ${payload.sku} saved to Etsy draft ${payload.externalListingId}.`); router.refresh();
                          } catch (error) { toast.error(error instanceof Error ? error.message : "SKU sync failed."); }
                          finally { setBusy(false); }
                        }}>Sync inventory SKU to Etsy</Button>}
                        {draft.syncError && <p className="mt-1 max-w-xl text-[10px] text-amber-700">{draft.syncError}</p>}
                        {draft.platform === "ETSY" && draft.externalId && draft.shopId && draft.syncError?.includes("Category attribute") && (
                          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={async () => {
                            setBusy(true);
                            try {
                              const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "repairEtsyAttributes", draftId: draft.id, shopId: draft.shopId }) });
                              const payload = await response.json();
                              if (!response.ok) throw new Error(payload.error || "Attribute repair failed.");
                              if (payload.warnings?.length) toast.warning(payload.warnings.join("; "));
                              else toast.success(`Etsy draft ${payload.externalListingId} attributes repaired.`);
                              router.refresh();
                            } catch (error) { toast.error(error instanceof Error ? error.message : "Attribute repair failed."); }
                            finally { setBusy(false); }
                          }}>Retry Etsy attributes</Button>
                        )}

                        {draft.platform === "EBAY" && draft.shopId && (
                          <div className="mt-2 space-y-2">
                            <EbayCompleteReview draftId={draft.id} shopId={draft.shopId!} sku={draft.sku} />
                            <details className="rounded border p-3"><summary className="cursor-pointer text-sm font-medium">Seller Hub transfer and downloads</summary>
                            <p className="mt-2 text-xs">Basic Seller Hub draft: {draft.sellerHubDraft?.state || "Not submitted"}{draft.sellerHubDraft?.draftId ? ` · Draft ID ${draft.sellerHubDraft.draftId}` : ""}</p>
                            {draft.sellerHubDraft?.completeUrl && <a className="text-xs underline" href={draft.sellerHubDraft.completeUrl} target="_blank" rel="noreferrer">Open Seller Hub draft</a>}
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" disabled={checkingOfferId !== null} onClick={async () => {
                                setCheckingOfferId(draft.id);
                                try {
                                  const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: draft.sellerHubDraft?.taskId ? "checkEbaySellerHubDraft" : "sendEbaySellerHubDraft", draftId: draft.id, shopId: draft.shopId }) });
                                  const payload = await response.json();
                                  if (!response.ok) throw new Error(payload.error || "Seller Hub transfer failed.");
                                  setOfferChecks((previous) => ({ ...previous, [draft.id]: payload.success ? `Seller Hub draft confirmed: ${payload.draftId}` : `Seller Hub ${payload.state}. ${payload.error || (payload.terminal ? "Download the upload result for details." : "Check again after eBay finishes processing.")}` }));
                                  if (payload.success) toast.success("Seller Hub draft confirmed.");
                                  router.refresh();
                                } catch (error) { toast.error(error instanceof Error ? error.message : "Seller Hub transfer failed."); }
                                finally { setCheckingOfferId(null); }
                              }}>{checkingOfferId === draft.id ? "Checking eBay…" : draft.sellerHubDraft?.taskId ? "Check Seller Hub upload" : "Send to Seller Hub"}</Button>
                              <Button type="button" variant="outline" size="sm" onClick={async () => {
                                try {
                                  const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "downloadEbaySellerHubDraftCsv", draftId: draft.id, shopId: draft.shopId }) });
                                  if (!response.ok) throw new Error("Unable to download the Seller Hub draft CSV.");
                                  const url = URL.createObjectURL(await response.blob());
                                  const link = document.createElement("a"); link.href = url; link.download = `${draft.sku}-seller-hub-draft.csv`; link.click(); URL.revokeObjectURL(url);
                                } catch (error) { toast.error(error instanceof Error ? error.message : "CSV download failed."); }
                              }}>Download draft CSV</Button>
                              {draft.sellerHubDraft?.taskId && <Button type="button" variant="outline" size="sm" onClick={async () => {
                                try {
                                  const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkEbaySellerHubDraft", draftId: draft.id, shopId: draft.shopId }) });
                                  const payload = await response.json();
                                  if (!response.ok || !payload.report) throw new Error(payload.error || "The upload result is not ready yet.");
                                  const url = URL.createObjectURL(new Blob([payload.report], { type: "text/csv;charset=utf-8" }));
                                  const link = document.createElement("a"); link.href = url; link.download = `${draft.sku}-upload-result.csv`; link.click(); URL.revokeObjectURL(url);
                                } catch (error) { toast.error(error instanceof Error ? error.message : "Result download failed."); }
                              }}>Download upload result</Button>}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={async () => {
                              try {
                                const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "downloadEbayDescription", draftId: draft.id, shopId: draft.shopId }) });
                                if (!response.ok) throw new Error("Unable to download the static HTML description.");
                                const url = URL.createObjectURL(await response.blob());
                                const link = document.createElement("a"); link.href = url; link.download = `${draft.sku}-description.html`; link.click(); URL.revokeObjectURL(url);
                              } catch (error) { toast.error(error instanceof Error ? error.message : "Description download failed."); }
                            }}>Download clean description HTML</Button>
                            <p className="max-w-xl text-xs text-muted-foreground">Basic draft imported only: item specifics, business policies, item location, and videos are not transferred by this draft template. Complete them in Seller Hub before publishing. To repair an existing description, paste the clean HTML into Show HTML Code. If an upload fails, upload the draft CSV through Seller Hub → Reports → Uploads.</p>
                            {offerChecks[draft.id] && <p className="text-xs">{offerChecks[draft.id]}</p>}
                            </details>
                          </div>
                        )}
                        {draft.platform === "EBAY" && draft.externalId && draft.shopId && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground">This API offer is separate from Seller Hub Drafts.</p>
                            <Button type="button" variant="outline" size="sm" disabled={checkingOfferId !== null} onClick={async () => {
                              setCheckingOfferId(draft.id);
                              try {
                                const response = await fetch("/api/marketplace/listing-preparation", {
                                  method: "POST", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "verifyEbayOffer", draftId: draft.id, shopId: draft.shopId }),
                                });
                                const payload = await response.json();
                                if (!response.ok) throw new Error(payload.error || "Unable to verify this eBay offer.");
                                setOfferChecks((previous) => ({ ...previous, [draft.id]: `eBay status: ${payload.status} · ${payload.environment}${payload.listingId ? ` · Listing ID: ${payload.listingId}` : " · No published listing ID"}` }));
                              } catch (error) {
                                setOfferChecks((previous) => ({ ...previous, [draft.id]: error instanceof Error ? error.message : "Unable to verify this eBay offer." }));
                              } finally { setCheckingOfferId(null); }
                            }}>{checkingOfferId === draft.id ? "Checking eBay…" : "Check eBay offer"}</Button>
                            {offerChecks[draft.id] && <p className="text-xs">{offerChecks[draft.id]}</p>}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                          {draft.regionalPrices ? (
                            <div className="space-y-0.5 text-xs">
                              <p className="font-medium">ERP regional prices</p>
                              <p>India · INR {draft.regionalPrices.india.toFixed(2)}</p>
                              <p>US · INR {draft.regionalPrices.us.toFixed(2)}</p>
                              <p>Global · INR {draft.regionalPrices.global.toFixed(2)}</p>
                              {draft.platform === "ETSY" && <p className="mt-2 max-w-xs text-left text-muted-foreground">Etsy receives one base price through its API. Set the separate domestic, US and global prices using Add global prices in Etsy.</p>}
                            </div>
                          ) : (
                            <p className="font-medium">{draft.currency} {draft.price.toFixed(2)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{draft.updatedAt.slice(0, 10)}</p>
                      </div>
                    </div>
                    </details>
                  ))}
                  </div>
                </div>
              )}
              </>}
            </CardContent>
          </Card>
          </div>

 </div>;
}
