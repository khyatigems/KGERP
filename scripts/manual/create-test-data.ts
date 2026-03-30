import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";
import { resolveInventoryCertificateUrl } from "../../lib/certificate-url";

async function main() {
  console.log("Testing certificate URL resolution...");
  
  // Create test inventory with certificate data
  const testInventory = await prisma.inventory.create({
    data: {
      sku: "TEST-CERT-001",
      itemName: "Test Diamond",
      category: "GEMS",
      gemType: "Diamond",
      pieces: 1,
      weightValue: 1.5,
      weightUnit: "CARAT",
      carats: 1.5,
      costPrice: 100000,
      sellingPrice: 150000,
      profit: 50000,
      condition: "NEW",
      status: "AVAILABLE",
      location: "Main Store",
      certificateNo: "https://www.gia.edu/report-check?reportno=1234567890",
      certification: "GIA",
      lab: "GIA",
      certificateComments: "Excellent cut, D color, VVS1 clarity"
    }
  });
  
  console.log("Created test inventory:", testInventory.sku);
  
  // Test URL resolution
  const resolvedUrl = resolveInventoryCertificateUrl(testInventory);
  console.log("Resolved certificate URL:", resolvedUrl);
  
  // Create test customer
  const testCustomer = await prisma.customer.create({
    data: {
      name: "Test Customer",
      phone: "9876543210",
      email: "test@example.com"
    }
  });
  
  // Create test sale
  const testSale = await prisma.sale.create({
    data: {
      inventoryId: testInventory.id,
      customerId: testCustomer.id,
      customerName: "Test Customer",
      customerPhone: "9876543210",
      customerEmail: "test@example.com",
      saleDate: new Date(),
      salePrice: 150000,
      netAmount: 150000,
      profit: 50000,
      paymentMethod: "CASH",
      paymentStatus: "PAID"
    }
  });
  
  // Create test invoice
  const testInvoice = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-2024-0001",
      token: "test-token-123",
      isActive: true,
      invoiceDate: new Date(),
      subtotal: 150000,
      taxTotal: 0,
      discountTotal: 0,
      totalAmount: 150000,
      paymentStatus: "PAID",
      paidAmount: 150000,
      status: "PAID"
    }
  });
  
  console.log("✅ Test data created successfully");
  console.log(`Invoice token: ${testInvoice.token}`);
  console.log(`View invoice at: http://localhost:3000/invoice/${testInvoice.token}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
