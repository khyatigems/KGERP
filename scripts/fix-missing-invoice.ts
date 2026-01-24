
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔧 Starting Missing Invoice Repair...');

  // 1. Find orphaned sales
  const orphanedSales = await prisma.sale.findMany({
    where: {
      invoiceId: null,
      legacyInvoiceId: null
    },
    include: {
      inventory: true
    },
    orderBy: {
      saleDate: 'asc'
    }
  });

  console.log(`Found ${orphanedSales.length} orphaned sales.`);

  if (orphanedSales.length === 0) {
    console.log('✅ No orphaned sales found.');
    return;
  }

  // 2. Get last invoice number to start incrementing
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const currentYear = new Date().getFullYear();
  let counter = 1;

  if (lastInvoice && lastInvoice.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    if (parts.length === 3) {
      const lastYear = parseInt(parts[1]);
      const lastCounter = parseInt(parts[2]);
      if (!isNaN(lastYear) && !isNaN(lastCounter)) {
         if (lastYear === currentYear) {
             counter = lastCounter + 1;
         }
      }
    }
  }

  // 3. Process each orphaned sale
  for (const sale of orphanedSales) {
    const invoiceNumber = `INV-${currentYear}-${String(counter).padStart(4, '0')}`;
    counter++;

    console.log(`Creating invoice ${invoiceNumber} for Sale ID: ${sale.id} (Customer: ${sale.customerName})`);

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    try {
        await prisma.$transaction(async (tx) => {
            // Create Invoice
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    token,
                    status: sale.paymentStatus === 'PAID' ? 'PAID' : 'ISSUED',
                    subtotal: sale.salePrice || 0,
                    taxTotal: sale.taxAmount || 0,
                    discountTotal: sale.discountAmount || 0,
                    totalAmount: sale.netAmount || sale.salePrice || 0,
                    createdAt: sale.saleDate,
                    isActive: true,
                }
            });

            // Update Sale
            await tx.sale.update({
                where: { id: sale.id },
                data: {
                    invoiceId: invoice.id
                }
            });
        });
        console.log(`✅ Fixed Sale ${sale.id}`);
    } catch (error) {
        console.error(`❌ Failed to fix Sale ${sale.id}:`, error);
    }
  }

  console.log('🎉 Repair complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
