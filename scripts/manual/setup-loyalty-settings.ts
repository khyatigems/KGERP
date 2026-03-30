import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { ensureBillfreePhase1Schema, prisma } from "../../lib/prisma";

async function main() {
  console.log("Setting up loyalty settings...");
  
  // Create default loyalty settings
  await prisma.$executeRawUnsafe(`
    INSERT OR REPLACE INTO "LoyaltySettings" (
      id, 
      pointsPerRupee, 
      redeemRupeePerPoint, 
      minRedeemPoints, 
      maxRedeemPercent, 
      dobProfilePoints, 
      anniversaryProfilePoints, 
      createdAt, 
      updatedAt
    ) VALUES (
      'default',
      0.01,
      1.0,
      10,
      30,
      50,
      25,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `);
  
  console.log("✅ Loyalty settings created/updated");
  
  // Verify settings
  const settings = await prisma.$queryRawUnsafe<Array<{
    pointsPerRupee: number;
    redeemRupeePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
  }>>(
    `SELECT pointsPerRupee, redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent FROM "LoyaltySettings" WHERE id = 'default'`
  );
  
  console.log("Current loyalty settings:", settings[0]);
  
  await prisma.$disconnect();
}

main().catch(console.error);
