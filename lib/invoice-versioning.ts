
import { prisma } from "@/lib/prisma";

export async function createInvoiceVersion(invoiceId: string, reason: string = "Edit") {
  try {
    // 1. Fetch full invoice data with all relevant relations
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        sales: {
          include: { 
              inventory: true 
          }
        },
        legacySale: {
          include: { 
              inventory: true 
          }
        },
        quotation: {
          include: { 
              items: true,
              customer: true
          }
        }
      }
    });

    if (!invoice) {
        console.error(`Invoice ${invoiceId} not found for versioning`);
        return;
    }

    // 2. Count existing versions to determine next version number
    const count = await prisma.invoiceVersion.count({
      where: { invoiceId }
    });

    // 3. Create new version
    await prisma.invoiceVersion.create({
      data: {
        invoiceId,
        versionNumber: count + 1,
        snapshot: JSON.stringify(invoice),
        reason
      }
    });

    console.log(`Created version ${count + 1} for invoice ${invoice.invoiceNumber}`);

  } catch (error) {
    console.error("Failed to create invoice version:", error);
    // Don't throw, so we don't block the main action
  }
}
