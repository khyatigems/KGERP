import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SaleForm } from "@/components/sales/sale-form";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

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

  const inventoryItems = await prisma.inventory.findMany({
    where: {
      status: "IN_STOCK",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const salesCustomers = await prisma.sale.findMany({
    select: {
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      customerCity: true,
      saleDate: true,
    },
    where: {
      customerName: {
        not: null,
      },
    },
    orderBy: {
      saleDate: "desc",
    },
    take: 50,
  });

  const quotedCustomers = await prisma.quotation.findMany({
    select: {
      customerName: true,
      customerMobile: true,
      customerEmail: true,
      customerCity: true,
      createdAt: true,
    },
    where: {},
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const customerMap = new Map<
    string,
    {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      city?: string | null;
    }
  >();

  salesCustomers.forEach((c, index) => {
    if (!c.customerName) return;
    const key = `${c.customerName.trim()}|${(c.customerPhone || "").trim()}|${(c.customerEmail || "").trim()}`;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: `sale-${index}-${key}`,
        name: c.customerName,
        phone: c.customerPhone,
        email: c.customerEmail,
        city: c.customerCity,
      });
    }
  });

  quotedCustomers.forEach((c, index) => {
    if (!c.customerName) return;
    const key = `${c.customerName.trim()}|${(c.customerMobile || "").trim()}|${(c.customerEmail || "").trim()}`;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: `quote-${index}-${key}`,
        name: c.customerName,
        phone: c.customerMobile,
        email: c.customerEmail,
        city: c.customerCity,
      });
    }
  });

  const existingCustomers = Array.from(customerMap.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Record New Sale</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <Suspense fallback={<div>Loading form...</div>}>
             <SaleForm inventoryItems={inventoryItems} existingCustomers={existingCustomers} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
