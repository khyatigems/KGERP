import { AdvancesPage } from "@/components/advances/advances-page";
import { getAdvances } from "./actions";
import { prisma } from "@/lib/prisma";

export default async function AdvancesPageRoute() {
  const [advancesResult, customers] = await Promise.all([
    getAdvances(),
    prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const advances = advancesResult.success ? advancesResult.data : [];

  // Map customers to match the expected type
  const mappedCustomers = customers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone || undefined,
  }));

  return <AdvancesPage advances={advances} customers={mappedCustomers} />;
}
