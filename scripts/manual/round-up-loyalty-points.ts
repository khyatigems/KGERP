import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function roundUpAllLoyaltyPoints() {
  console.log("🔄 Rounding Up All Decimal Loyalty Points...\n");
  
  try {
    // Check current loyalty ledger entries with decimal points
    const decimalEntries = await prisma.$queryRawUnsafe(`
      SELECT id, customerId, points, rupeeValue, type, remarks, createdAt
      FROM "LoyaltyLedger" 
      WHERE points != CAST(points AS INTEGER)
      ORDER BY createdAt DESC
    `);
    
    console.log(`📊 Found ${(decimalEntries as any[]).length} entries with decimal points:`);
    
    if ((decimalEntries as any[]).length === 0) {
      console.log("✅ No decimal points found - all loyalty points are already whole numbers!");
      return;
    }
    
    // Show decimal entries before update
    (decimalEntries as any[]).forEach((entry: any, i: number) => {
      console.log(`   ${i+1}. Customer: ${entry.customerId}, Type: ${entry.type}, Points: ${entry.points} → ${Math.ceil(entry.points)}`);
    });
    
    // Update all decimal entries to round up
    console.log("\n🔧 Updating decimal entries to round up...");
    
    let updatedCount = 0;
    for (const entry of (decimalEntries as any[])) {
      const roundedPoints = Math.ceil(entry.points);
      const additionalPoints = roundedPoints - entry.points;
      
      if (additionalPoints > 0) {
        await prisma.$executeRawUnsafe(`
          UPDATE "LoyaltyLedger" 
          SET points = ?, rupeeValue = rupeeValue + ?, remarks = ? || ' (rounded up from ' || ? || ')'
          WHERE id = ?
        `, roundedPoints, additionalPoints * 1, entry.remarks, entry.points, entry.id);
        
        updatedCount++;
        console.log(`   ✅ Updated: ${entry.points} → ${roundedPoints} (+${additionalPoints} bonus points)`);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} loyalty entries!`);
    
    // Show updated customer balances
    console.log("\n💰 Updated Customer Balances:");
    const updatedBalances = await prisma.$queryRawUnsafe(`
      SELECT customerId, CAST(COALESCE(SUM(CAST(points AS REAL)),0) AS REAL) as totalPoints
      FROM "LoyaltyLedger" 
      GROUP BY customerId 
      HAVING CAST(COALESCE(SUM(CAST(points AS REAL)),0) AS REAL) != 0
      ORDER BY totalPoints DESC
      LIMIT 10
    `);
    
    (updatedBalances as any[]).forEach((balance: any, i: number) => {
      console.log(`   ${i+1}. Customer: ${balance.customerId}, Balance: ${balance.totalPoints} points`);
    });
    
    console.log("\n✅ All decimal loyalty points have been rounded up!");
    console.log("🎁 Customers received bonus points for any decimal amounts!");
    
  } catch (error) {
    console.error("❌ Error rounding up loyalty points:", error);
  }
  
  await prisma.$disconnect();
}

roundUpAllLoyaltyPoints().catch(console.error);
