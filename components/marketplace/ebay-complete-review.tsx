"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EbayMarketplaceDraftInput } from "@/lib/marketplace/connectors/ebay";
import type { DraftSettingGroup } from "@/lib/marketplace/draft-settings";

type Review = {
  input: EbayMarketplaceDraftInput;
  locations: Array<{ merchantLocationKey: string; name?: string; location?: { address?: { country?: string; postalCode?: string; city?: string } } }>;
  policyGroups: DraftSettingGroup[];
  preparation: { state: string; reviewToken?: string; error?: string; locationKey?: string } | null;
  shopName: string;
};

export function EbayCompleteReview({ draftId, shopId, sku }: { draftId: string; shopId: string; sku: string }) {
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [locationKey, setLocationKey] = useState("");
  const [address, setAddress] = useState({ country: "IN", postalCode: "122001", city: "Kpmg" });
  const [confirmation, setConfirmation] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  async function request(action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/marketplace/listing-preparation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, draftId, shopId, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "eBay operation failed.");
    return data;
  }
  function changeInput(input: EbayMarketplaceDraftInput) { setReview((current) => current ? { ...current, input } : current); setToken(""); setConfirmation(""); }
  return <div className="space-y-3 rounded-lg border p-3">
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={async () => {
      setBusy(true); setMessage("");
      try {
        const data: Review = await request("reviewCompleteEbay");
        setReview(data); setLocationKey(data.preparation?.locationKey || "");
        setToken(data.preparation?.state === "READY" ? data.preparation.reviewToken || "" : "");
        setMessage(data.preparation?.error || "");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Review failed."); } finally { setBusy(false); }
    }}>{busy ? "Working…" : "Review complete listing in ERP"}</Button>
    {review && <div className="space-y-3 text-sm">
      <p className="font-medium">{review.shopName} · {sku} · Fixed price · GTC</p>
      <p>Saving keeps this draft unpublished. Preparing transfers all entered fields to an API offer. Publish creates a live listing, separate from the basic Seller Hub draft.</p>
      <Label>Title<Input value={review.input.title} maxLength={80} onChange={(event) => changeInput({ ...review.input, title: event.target.value })} disabled={busy} /></Label>
      <div className="grid grid-cols-2 gap-2">
        <Label>Price ({review.input.currency})<Input type="number" min="0.01" step="0.01" value={review.input.price} onChange={(event) => changeInput({ ...review.input, price: Number(event.target.value) })} disabled={busy} /></Label>
        <Label>Quantity<Input type="number" min="1" step="1" value={review.input.quantity} onChange={(event) => changeInput({ ...review.input, quantity: Number(event.target.value) })} disabled={busy} /></Label>
      </div>
      <p>Category: {review.input.categoryId} · Condition: {review.input.condition}</p>
      {Object.entries(review.input.aspects).map(([name, values]) => <Label key={name} className="block">{name}<Input value={values.join(" | ")} onChange={(event) => changeInput({ ...review.input, aspects: { ...review.input.aspects, [name]: [event.target.value] } })} disabled={busy} /></Label>)}
      {review.policyGroups.map((group) => <Label key={group.key} className="block">{group.label}<select className="mt-1 block w-full rounded border bg-background p-2" value={review.input.draftSettings?.[group.key] || group.selectedId} onChange={(event) => changeInput({ ...review.input, draftSettings: { ...review.input.draftSettings, [group.key]: event.target.value } })} disabled={busy}>
        <option value="">Choose policy</option>{group.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select></Label>)}
      <details><summary>Description HTML</summary><textarea className="mt-2 h-40 w-full rounded border bg-background p-2" value={review.input.description} onChange={(event) => changeInput({ ...review.input, description: event.target.value })} disabled={busy} /><iframe title={`Description preview for ${sku}`} sandbox="" srcDoc={review.input.description} className="h-64 w-full bg-white" /></details>
      <p>{review.input.media.filter((asset) => asset.type === "IMAGE").length} photos · {review.input.media.filter((asset) => asset.type === "VIDEO").length} videos</p>
      <ul>{review.input.media.map((asset) => <li key={asset.mediaUrl}><a href={asset.mediaUrl} target="_blank" rel="noreferrer" className="underline">{asset.type}: {asset.mediaUrl.split("/").pop()}</a></li>)}</ul>
      <Label className="block">Dispatch location<select className="mt-1 block w-full rounded border bg-background p-2" value={locationKey} onChange={(event) => { setLocationKey(event.target.value); setToken(""); }} disabled={busy}>
        <option value="">Use dispatch address below</option>{review.locations.map((location) => <option key={location.merchantLocationKey} value={location.merchantLocationKey}>{location.name || location.merchantLocationKey} · {location.location?.address?.city} · {location.location?.address?.postalCode} · {location.location?.address?.country}</option>)}
      </select></Label>
      {!locationKey && <div className="grid grid-cols-3 gap-2">{(["country", "postalCode", "city"] as const).map((key) => <Label key={key}>{key === "country" ? "Country code" : key === "postalCode" ? "Postal code" : "City"}<Input value={address[key]} onChange={(event) => { setAddress({ ...address, [key]: event.target.value }); setToken(""); }} disabled={busy} /></Label>)}</div>}
      <Button type="button" disabled={busy} variant="outline" onClick={async () => {
        setBusy(true); setToken(""); setMessage("");
        try {
          const result = await request("prepareCompleteEbay", { locationKey: locationKey || undefined, dispatchAddress: locationKey ? undefined : address, completeEdits: { title: review.input.title, price: review.input.price, quantity: review.input.quantity, description: review.input.description, aspects: review.input.aspects, draftSettings: review.input.draftSettings } });
          setToken(result.reviewToken); setReview({ ...review, input: result.input }); setMessage("All entered fields were verified against eBay's saved offer. Nothing published.");
        } catch (error) { setMessage(error instanceof Error ? error.message : "Preparation failed."); } finally { setBusy(false); }
      }}>Save edits and verify complete eBay offer</Button>
      {message && <p role="status">{message}</p>}
      {(token || ["PUBLISHING", "PUBLISH_UNCERTAIN"].includes(review.preparation?.state || "")) && <div className="space-y-2 rounded border p-3">
        <p>Publishing makes this item live at {review.input.currency} {review.input.price.toFixed(2)}. eBay fees may apply. Any separate Seller Hub draft remains; do not publish it again.</p>
        <Label>Type {sku} to confirm<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} /></Label>
        <Button type="button" disabled={busy || confirmation !== sku} onClick={async () => {
          setBusy(true);
          try {
            const result = await request("publishCompleteEbay", { reviewToken: token || review.preparation?.reviewToken, confirmationSku: confirmation });
            toast.success(`eBay listing published: ${result.listingId}`); setReview(null); router.refresh();
          } catch (error) { setMessage(error instanceof Error ? error.message : "Publish status is unconfirmed. Reload review before trying again."); setToken(""); router.refresh(); } finally { setBusy(false); }
        }}>{token ? "Publish live listing to eBay" : "Check publication status"}</Button>
      </div>}
    </div>}
  </div>;
}
