import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { NewSalesPage } from "@/components/sales/new-sales-page-redesigned";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { mergePlatformConfig } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "New Sale | KhyatiGems™",
};

export default async function NewSalePage() {
  const perm = await checkPermission(PERMISSIONS.SALES_CREATE);
  if (!perm.success) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> {perm.message}</span>
        </div>
      </div>
    );
  }

  // Fetch company and invoice settings
  const [companySettings, invoiceSettings, platformSetting] = await Promise.all([
    prisma.companySettings.findFirst({
      select: {
        companyName: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        phone: true,
        email: true,
        gstin: true,
      },
    }),
    prisma.invoiceSettings.findFirst({
      select: {
        gstEnabled: true,
        gstType: true,
        categoryGstRates: true,
        prefix: true,
      },
    }),
    prisma.setting.findUnique({ where: { key: "invoice_platforms" } }).catch(() => null),
  ]);

  const mergedPlatformConfig = mergePlatformConfig(platformSetting?.value);
  const platformOptions = Object.values(mergedPlatformConfig)
    .filter((entry) => entry.active)
    .map((entry) => ({
      code: entry.code,
      label: entry.label,
      logoUrl: entry.logoUrl,
      active: entry.active,
    }));

  const inventoryItems = await prisma.inventory.findMany({
    where: {
      status: "IN_STOCK",
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      sku: true,
      itemName: true,
      sellingPrice: true,
      category: true,
      gemType: true,
      status: true,
    },
  });

  const existingCustomers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      country: true,
      pincode: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Record New Sale</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <Suspense fallback={<div>Loading form...</div>}>
             <NewSalesPage 
               inventoryItems={inventoryItems} 
               existingCustomers={existingCustomers} 
               companySettings={{
                 gstEnabled: invoiceSettings?.gstEnabled || false,
                 gstType: invoiceSettings?.gstType || "CGST_SGST",
                 categoryGstRates: invoiceSettings?.categoryGstRates || "{}",
                 invoicePrefix: invoiceSettings?.prefix || "INV",
                 companyName: companySettings?.companyName || "",
                 companyAddress: companySettings?.address || "",
                 companyCity: companySettings?.city || "",
                 companyState: companySettings?.state || "",
                 companyPincode: companySettings?.pincode || "",
                 companyCountry: companySettings?.country || "",
                 companyPhone: companySettings?.phone || "",
                 companyEmail: companySettings?.email || "",
                 companyGstin: companySettings?.gstin || "",
               }}
               platformOptions={platformOptions}
             />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
