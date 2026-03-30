import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { createSale } from "../../app/(dashboard)/sales/actions";
import { checkPermission } from "../../lib/permission-guard";
import { PERMISSIONS } from "../../lib/permissions";

async function testInvoiceCreation() {
  console.log("🧪 Testing Invoice Creation with Minimal Data...\n");

  try {
    // Get a sample inventory item
    const sampleItem = await prisma.inventory.findFirst({
      where: { status: 'IN_STOCK' },
      select: { id: true, sku: true, sellingPrice: true }
    });

    if (!sampleItem) {
      console.error("❌ No items in stock to test with");
      return;
    }

    console.log(`✅ Using test item: ${sampleItem.sku} (₹${sampleItem.sellingPrice})`);

    // Get or create a test customer
    let testCustomer = await prisma.customer.findFirst();
    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          name: "Test Customer",
          phone: "9876543210",
          email: "test@example.com"
        }
      });
      console.log("✅ Created test customer");
    } else {
      console.log(`✅ Using existing customer: ${testCustomer.name}`);
    }

    // Prepare minimal form data
    const formData = new FormData();
    
    // Basic sale data
    formData.set('platform', 'OFFLINE');
    formData.set('saleDate', new Date().toISOString());
    formData.set('customerId', testCustomer.id);
    formData.set('customerName', testCustomer.name);
    formData.set('customerPhone', testCustomer.phone || '');
    formData.set('customerEmail', testCustomer.email || '');
    formData.set('paymentStatus', 'UNPAID');
    formData.set('remarks', 'Test invoice creation');

    // Item data
    const items = [{
      inventoryId: sampleItem.id,
      sellingPrice: sampleItem.sellingPrice || 1000,
      discount: 0
    }];
    formData.set('items', JSON.stringify(items));

    console.log("\n🚀 Attempting to create invoice...");

    // Test the createSale function
    const result = await createSale(null, formData);
    
    if (result.success) {
      console.log("✅ SUCCESS: Invoice created successfully!");
      console.log(`   Message: ${result.message}`);
    } else {
      console.error("❌ FAILED: Invoice creation failed");
      console.error(`   Error: ${result.message}`);
      
      if (result.errors) {
        console.error("   Validation errors:");
        Object.entries(result.errors).forEach(([field, errors]) => {
          console.error(`     ${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`);
        });
      }
    }

  } catch (error) {
    console.error("❌ EXCEPTION during test:", error);
    console.error("   Error details:", error instanceof Error ? error.message : error);
    console.error("   Stack:", error instanceof Error ? error.stack : 'No stack available');
  }

  await prisma.$disconnect();
}

testInvoiceCreation().catch((error) => {
  console.error("❌ Test script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
