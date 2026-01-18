import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotes/quotation-form";

export const metadata: Metadata = {
  title: "New Quotation | Khyati Gems",
};

export default async function NewQuotationPage() {
  const availableItems = await prisma.inventory.findMany({
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
      createdAt: true,
    },
    where: {
      customerName: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
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
    where: {
      customerName: {
        not: null,
      },
    },
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
        <h1 className="text-3xl font-bold tracking-tight">Create Quotation</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <QuotationForm availableItems={availableItems} existingCustomers={existingCustomers} />
        </div>
      </div>
    </div>
  );
}
