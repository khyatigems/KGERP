import { config } from "dotenv";

config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../../lib/prisma";

async function applyStandardRounding() {
  console.log("🔄 Applying Standard Rounding Rules to Existing Loyalty Points...\n");
  
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
      const originalPoints = entry.points;
      const roundedPoints = Math.round(originalPoints);
      const adjustment = roundedPoints - originalPoints;
      const direction = adjustment > 0 ? "↑" : adjustment < 0 ? "↓" : "→";
      console.log(`   ${i+1}. Customer: ${entry.customerId}, Type: ${entry.type}, Points: ${originalPoints} ${direction} ${roundedPoints} (${adjustment > 0 ? '+' : ''}${adjustment})`);
    });
    
    // Update all decimal entries to use standard rounding
    console.log("\n🔧 Updating decimal entries to use standard rounding...");
    
    let updatedCount = 0;
    let bonusGiven = 0;
    let pointsReduced = 0;
    
    for (const entry of (decimalEntries as any[])) {
      const originalPoints = entry.points;
      const roundedPoints = Math.round(originalPoints);
      const adjustment = roundedPoints - originalPoints;
      
      if (adjustment !== 0) {
        await prisma.$executeRawUnsafe(`
          UPDATE "LoyaltyLedger" 
          SET points = ?, rupeeValue = rupeeValue + ?, remarks = ? || ' (standard rounded from ' || ? || ')'
          WHERE id = ?
        `, roundedPoints, adjustment * 1, entry.remarks, originalPoints, entry.id);
        
        updatedCount++;
        if (adjustment > 0) {
          bonusGiven += adjustment;
        } else {
          pointsReduced += Math.abs(adjustment);
        }
        
        const action = adjustment > 0 ? "bonus" : "reduced";
        console.log(`   ✅ Updated: ${originalPoints} → ${roundedPoints} (${adjustment > 0 ? '+' : ''}${adjustment} points ${action})`);
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} loyalty entries!`);
    console.log(`📊 Summary:`);
    console.log(`   • Total bonus points given: ${bonusGiven}`);
    console.log(`   • Total points reduced: ${pointsReduced}`);
    console.log(`   • Net effect: ${bonusGiven - pointsReduced > 0 ? '+' : ''}${bonusGiven - pointsReduced} points`);
    
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
    
    console.log("\n✅ Standard Rounding Rules Applied!");
    console.log("📋 New Rounding Logic:");
    console.log("   • < 0.5 → Round down (10.3 → 10)");
    console.log("   • ≥ 0.5 → Round up (10.5 → 11)");
    console.log("   • Fair and balanced approach!");
    
  } catch (error) {
    console.error("❌ Error applying standard rounding:", error);
  }
  
  await prisma.$disconnect();
}

applyStandardRounding().catch(console.error);
