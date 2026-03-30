import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";
import { GOVERNANCE_SETTING_KEYS, getGovernanceConfig } from "../../lib/governance";

async function checkGovernanceSettings() {
  console.log("🔒 Checking Governance Settings...\n");

  try {
    const config = await getGovernanceConfig();
    
    console.log("Current Governance Configuration:");
    console.log(`❄️  Freeze Mode: ${config.freezeMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📋 Block Sale Without Certification: ${config.blockSaleWithoutCertification ? 'YES' : 'NO'}`);
    console.log(`👤 Block Invoice Without Customer Name: ${config.blockInvoiceWithoutCustomerName ? 'YES' : 'NO'}`);
    console.log(`📸 Minimum Images For Listing: ${config.minImagesForListing}`);

    if (config.freezeMode) {
      console.log("\n❌ ISSUE FOUND: System is in FREEZE MODE!");
      console.log("   This blocks all sales/invoice creation operations.");
      console.log("   Solution: Disable freeze mode in governance settings.");
    }

    if (config.blockSaleWithoutCertification) {
      console.log("\n⚠️  Certification Required: Sales without certification are blocked");
      console.log("   Ensure all items have proper certification before selling.");
    }

    if (config.blockInvoiceWithoutCustomerName) {
      console.log("\n⚠️  Customer Name Required: Invoices without customer name are blocked");
      console.log("   Ensure customer name is provided when creating invoices.");
    }

    // Check raw settings
    console.log("\n📄 Raw Settings from Database:");
    const allSettings = await prisma.setting.findMany({
      where: { key: { startsWith: 'governance_' } }
    });

    allSettings.forEach(setting => {
      console.log(`   ${setting.key}: ${setting.value}`);
    });

    if (allSettings.length === 0) {
      console.log("   No governance settings found (using defaults)");
    }

  } catch (error) {
    console.error("❌ Failed to check governance settings:", error);
  }

  await prisma.$disconnect();
}

checkGovernanceSettings().catch((error) => {
  console.error("❌ Script failed:", error);
  prisma.$disconnect().finally(() => process.exit(1));
});
