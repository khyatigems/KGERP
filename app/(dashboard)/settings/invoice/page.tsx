import { Metadata } from "next";
import { getInvoiceSettings } from "./actions";
import { InvoiceSettingsForm } from "./invoice-settings-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Invoice Settings | KhyatiGems™ ERP",
};

export default async function InvoiceSettingsPage() {
  const { settings, paymentSettings } = await getInvoiceSettings();
  const categories = await prisma.categoryCode.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoice Settings</h1>
            <p className="text-muted-foreground">Configure invoice appearance, legal terms, and payment integrations.</p>
        </div>
      </div>
      
      <InvoiceSettingsForm 
        initialSettings={settings} 
        initialPaymentSettings={paymentSettings} 
        categories={categories}
      />
    </div>
  );
}
