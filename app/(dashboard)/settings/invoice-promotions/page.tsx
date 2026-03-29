import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getInvoicePromotionSettings } from "./actions";
import { InvoicePromotionsForm } from "./invoice-promotions-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice Promotions | KhyatiGems™ ERP",
};

export default async function InvoicePromotionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) redirect("/");
  const data = await getInvoicePromotionSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoice Promotions</h1>
        <p className="text-muted-foreground">Manage banners, review/referral CTA toggles, and DOB/anniversary reward amounts.</p>
      </div>
      <InvoicePromotionsForm initialSettings={data.settings} initialBanners={data.banners} />
    </div>
  );
}
