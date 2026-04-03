import { AdvancesPage } from "@/components/advances/advances-page";
import { getAdvances } from "./actions";
import { prisma } from "@/lib/prisma";

export default async function AdvancesPageRoute() {
  const [advancesResult, customers, companySettings] = await Promise.all([
    getAdvances(),
    prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.companySettings.findFirst(),
  ]);

  const advances = advancesResult.success ? advancesResult.data : [];

  // Map customers to match the expected type
  const mappedCustomers = customers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone || undefined,
    address: c.address || undefined,
    email: c.email || undefined,
  }));

  return <AdvancesPage 
    advances={advances} 
    customers={mappedCustomers} 
    companySettings={companySettings || undefined}
  />;
}
