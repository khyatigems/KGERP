import { prisma } from "@/lib/prisma";
import { normalizeDateToUtcNoon } from "@/lib/date";

async function run() {
  const invoices = await prisma.invoice.findMany({
    where: { invoiceDate: null },
    select: { id: true, createdAt: true, sales: { select: { saleDate: true }, orderBy: { saleDate: "asc" } } }
  });

  for (const inv of invoices) {
    const firstSaleDate = inv.sales[0]?.saleDate;
    const sourceDate = firstSaleDate || inv.createdAt;
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { invoiceDate: normalizeDateToUtcNoon(sourceDate) }
    });
  }

  console.log(`Backfilled invoiceDate for ${invoices.length} invoice(s)`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

