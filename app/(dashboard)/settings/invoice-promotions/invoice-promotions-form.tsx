"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createOfferBanner,
  saveInvoicePromotionSettings,
  toggleOfferBanner,
  type InvoicePromotionSettingsDto,
  type OfferBannerRow,
} from "./actions";

export function InvoicePromotionsForm({
  initialSettings,
  initialBanners,
}: {
  initialSettings: InvoicePromotionSettingsDto;
  initialBanners: OfferBannerRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);
  const [banners, setBanners] = useState(initialBanners);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    ctaText: "",
    ctaLink: "",
    displayOn: "invoice",
    audienceFilter: "all",
    priority: 0,
    startDate: "",
    endDate: "",
  });

  const saveSettings = () => {
    startTransition(async () => {
      const res = await saveInvoicePromotionSettings(settings);
      if (!res?.success) {
        toast.error(res?.message || "Failed");
        return;
      }
      toast.success("Invoice promotion settings saved");
    });
  };

  const createBanner = () => {
    startTransition(async () => {
      const res = await createOfferBanner(bannerForm);
      if (!res?.success) {
        toast.error(res?.message || "Failed");
        return;
      }
      toast.success("Offer banner created");
      window.location.reload();
    });
  };

  const toggle = (id: string, next: boolean) => {
    startTransition(async () => {
      const res = await toggleOfferBanner(id, next);
      if (!res?.success) {
        toast.error(res?.message || "Failed");
        return;
      }
      setBanners((p) => p.map((b) => (b.id === id ? { ...b, isActive: next ? 1 : 0 } : b)));
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Invoice Promotion Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm mb-1">Enable Review CTA</div>
            <Select value={settings.enableReviewCta ? "1" : "0"} onValueChange={(v) => setSettings((p) => ({ ...p, enableReviewCta: v === "1" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">Enabled</SelectItem><SelectItem value="0">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm mb-1">Enable Referral CTA</div>
            <Select value={settings.enableReferralCta ? "1" : "0"} onValueChange={(v) => setSettings((p) => ({ ...p, enableReferralCta: v === "1" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">Enabled</SelectItem><SelectItem value="0">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">DOB/Anniversary reward points are now controlled from Loyalty Settings.</div>
        <Button onClick={saveSettings} disabled={isPending}>Save Promotion Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Create Offer Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Title" value={bannerForm.title} onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))} />
          <Input placeholder="Image URL" value={bannerForm.imageUrl} onChange={(e) => setBannerForm((p) => ({ ...p, imageUrl: e.target.value }))} />
          <Input placeholder="CTA Text" value={bannerForm.ctaText} onChange={(e) => setBannerForm((p) => ({ ...p, ctaText: e.target.value }))} />
          <Input placeholder="CTA Link" value={bannerForm.ctaLink} onChange={(e) => setBannerForm((p) => ({ ...p, ctaLink: e.target.value }))} />
          <Select value={bannerForm.displayOn} onValueChange={(v) => setBannerForm((p) => ({ ...p, displayOn: v }))}>
            <SelectTrigger><SelectValue placeholder="Display On" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Invoice Page</SelectItem>
              <SelectItem value="public">Public Pages</SelectItem>
              <SelectItem value="customer">Customer Pages</SelectItem>
            </SelectContent>
          </Select>
          <Select value={bannerForm.audienceFilter} onValueChange={(v) => setBannerForm((p) => ({ ...p, audienceFilter: v }))}>
            <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="tier:gold">Gold Tier</SelectItem>
              <SelectItem value="tier:silver">Silver Tier</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Priority" value={bannerForm.priority} onChange={(e) => setBannerForm((p) => ({ ...p, priority: Number(e.target.value || 0) }))} />
          <Input type="date" value={bannerForm.startDate} onChange={(e) => setBannerForm((p) => ({ ...p, startDate: e.target.value }))} />
          <Input type="date" value={bannerForm.endDate} onChange={(e) => setBannerForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
        <Button onClick={createBanner} disabled={isPending}>Create Banner</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Offer Banners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
        {banners.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm">
              <div className="font-medium">{b.title}</div>
              <div className="text-muted-foreground">
                {b.displayOn} • {b.audienceFilter} • Priority {b.priority} • {b.isActive ? "Active" : "Inactive"}
              </div>
            </div>
            <Button variant="outline" onClick={() => toggle(b.id, !b.isActive)} disabled={isPending}>
              {b.isActive ? "Disable" : "Activate"}
            </Button>
          </div>
        ))}
        </CardContent>
      </Card>
    </div>
  );
}
