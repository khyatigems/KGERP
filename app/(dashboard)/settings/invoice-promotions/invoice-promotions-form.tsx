"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="text-base font-semibold">Invoice Promotion Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm mb-1">DOB Reward Amount</div>
            <Input type="number" value={settings.dobRewardAmount} onChange={(e) => setSettings((p) => ({ ...p, dobRewardAmount: Number(e.target.value || 0) }))} />
          </div>
          <div>
            <div className="text-sm mb-1">Anniversary Reward Amount</div>
            <Input type="number" value={settings.anniversaryRewardAmount} onChange={(e) => setSettings((p) => ({ ...p, anniversaryRewardAmount: Number(e.target.value || 0) }))} />
          </div>
          <div>
            <div className="text-sm mb-1">Enable Review CTA (1/0)</div>
            <Input value={settings.enableReviewCta ? "1" : "0"} onChange={(e) => setSettings((p) => ({ ...p, enableReviewCta: e.target.value === "1" }))} />
          </div>
          <div>
            <div className="text-sm mb-1">Enable Referral CTA (1/0)</div>
            <Input value={settings.enableReferralCta ? "1" : "0"} onChange={(e) => setSettings((p) => ({ ...p, enableReferralCta: e.target.value === "1" }))} />
          </div>
        </div>
        <Button onClick={saveSettings} disabled={isPending}>Save Promotion Settings</Button>
      </div>

      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="text-base font-semibold">Create Offer Banner</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Title" value={bannerForm.title} onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))} />
          <Input placeholder="Image URL" value={bannerForm.imageUrl} onChange={(e) => setBannerForm((p) => ({ ...p, imageUrl: e.target.value }))} />
          <Input placeholder="CTA Text" value={bannerForm.ctaText} onChange={(e) => setBannerForm((p) => ({ ...p, ctaText: e.target.value }))} />
          <Input placeholder="CTA Link" value={bannerForm.ctaLink} onChange={(e) => setBannerForm((p) => ({ ...p, ctaLink: e.target.value }))} />
          <Input placeholder="Display On" value={bannerForm.displayOn} onChange={(e) => setBannerForm((p) => ({ ...p, displayOn: e.target.value }))} />
          <Input placeholder="Audience Filter" value={bannerForm.audienceFilter} onChange={(e) => setBannerForm((p) => ({ ...p, audienceFilter: e.target.value }))} />
          <Input type="number" placeholder="Priority" value={bannerForm.priority} onChange={(e) => setBannerForm((p) => ({ ...p, priority: Number(e.target.value || 0) }))} />
          <Input type="date" value={bannerForm.startDate} onChange={(e) => setBannerForm((p) => ({ ...p, startDate: e.target.value }))} />
          <Input type="date" value={bannerForm.endDate} onChange={(e) => setBannerForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
        <Button onClick={createBanner} disabled={isPending}>Create Banner</Button>
      </div>

      <div className="rounded-lg border p-5 space-y-3">
        <h3 className="text-base font-semibold">Offer Banners</h3>
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
      </div>
    </div>
  );
}

