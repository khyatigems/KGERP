import { prisma } from "@/lib/prisma";

const INVOICE_NUMBER = process.argv[2] || "INV-2026-0020";

async function updateInvoice() {
  try {
    console.log(`Updating invoice ${INVOICE_NUMBER} to EXPORT_INVOICE...`);
    
    const result = await prisma.invoice.updateMany({
      where: { invoiceNumber: INVOICE_NUMBER },
      data: {
        invoiceType: "EXPORT_INVOICE",
        exportType: "LUT",
        countryOfDestination: "International",
      },
    });
    
    if (result.count === 0) {
      console.log(`Invoice ${INVOICE_NUMBER} not found.`);
      process.exit(1);
    }
    
    // Verify the update
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: INVOICE_NUMBER },
      select: {
        invoiceNumber: true,
        invoiceType: true,
        exportType: true,
        countryOfDestination: true,
      },
    });
    
    console.log("Update successful!");
    console.log("Invoice details:", invoice);
    process.exit(0);
  } catch (error) {
    console.error("Error updating invoice:", error);
    process.exit(1);
  }
}

updateInvoice();
