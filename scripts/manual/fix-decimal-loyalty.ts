import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL or TURSO_DATABASE_URL not found in environment");
  process.exit(1);
}

console.log("Database URL:", DATABASE_URL.replace(/token=.*$/, "token=***"));

// Create LibSQL client and Prisma adapter
const libsqlClient = createClient({
  url: DATABASE_URL,
  authToken: AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsqlClient);
const prisma = new PrismaClient({ adapter } as any);

async function fixDecimalLoyaltyEntries() {
  console.log("\n=== Starting Loyalty Points Decimal Fix ===\n");

  try {
    // Find all entries with decimal points
    const decimalEntries = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        customerId: string;
        invoiceId: string | null;
        type: string;
        points: number;
        rupeeValue: number;
        remarks: string | null;
        createdAt: string;
      }>
    >(
      `SELECT id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt
       FROM "LoyaltyLedger"
       WHERE points != ROUND(points)`
    );

    console.log(`Found ${decimalEntries.length} entries with decimal points\n`);

    if (decimalEntries.length === 0) {
      console.log("No decimal entries found. All loyalty points are whole numbers.");
      return;
    }

    // Group by type for reporting
    const earnEntries = decimalEntries.filter((e) => e.type === "EARN");
    const redeemEntries = decimalEntries.filter((e) => e.type === "REDEEM");
    const adjustEntries = decimalEntries.filter((e) => e.type === "ADJUST");

    console.log(`Breakdown:`);
    console.log(`  - EARN: ${earnEntries.length} entries`);
    console.log(`  - REDEEM: ${redeemEntries.length} entries`);
    console.log(`  - ADJUST: ${adjustEntries.length} entries\n`);

    // Show sample entries
    console.log("Sample entries to be fixed:");
    decimalEntries.slice(0, 5).forEach((entry) => {
      const roundedPoints = Math.round(entry.points);
      console.log(
        `  ${entry.id.substring(0, 8)}... | ${entry.type} | ${entry.points} → ${roundedPoints} | Invoice: ${entry.invoiceId || "N/A"}`
      );
    });
    if (decimalEntries.length > 5) {
      console.log(`  ... and ${decimalEntries.length - 5} more entries`);
    }
    console.log();

    // Confirm before proceeding
    console.log("This will update all decimal loyalty points to whole numbers using Math.round()");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Fix entries by type
    let fixedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const entry of decimalEntries) {
        const roundedPoints = Math.round(entry.points);
        const roundedRupeeValue = Math.round(entry.rupeeValue * 100) / 100; // Keep rupee value at 2 decimals

        await tx.$executeRawUnsafe(
          `UPDATE "LoyaltyLedger"
           SET points = ?, rupeeValue = ?, remarks = COALESCE(remarks, '') || ' [Auto-fixed: rounded from ' || ? || ']'
           WHERE id = ?`,
          roundedPoints,
          roundedRupeeValue,
          entry.points,
          entry.id
        );

        fixedCount++;

        if (fixedCount % 10 === 0) {
          console.log(`Fixed ${fixedCount}/${decimalEntries.length} entries...`);
        }
      }
    });

    console.log(`\n✅ Successfully fixed ${fixedCount} loyalty entries`);

    // Verify the fix
    const remainingDecimals = await prisma.$queryRawUnsafe<
      Array<{ count: number }>
    >(
      `SELECT COUNT(*) as count FROM "LoyaltyLedger" WHERE points != ROUND(points)`
    );

    const remainingCount = Number(remainingDecimals[0]?.count || 0);
    if (remainingCount === 0) {
      console.log("✅ Verification: All loyalty points are now whole numbers");
    } else {
      console.log(`⚠️ Warning: ${remainingCount} entries still have decimal points`);
    }

    // Show updated customer balances
    console.log("\n=== Updated Customer Balances ===");
    const customerBalances = await prisma.$queryRawUnsafe<
      Array<{ customerId: string; totalPoints: number }>
    >(
      `SELECT customerId, SUM(points) as totalPoints
       FROM "LoyaltyLedger"
       GROUP BY customerId
       HAVING totalPoints != 0
       ORDER BY totalPoints DESC
       LIMIT 10`
    );

    customerBalances.forEach((bal) => {
      console.log(`  ${bal.customerId.substring(0, 8)}...: ${Number(bal.totalPoints).toFixed(2)} points`);
    });

    console.log("\n=== Fix Complete ===");
    console.log("Future loyalty transactions will use whole numbers only.");
    console.log("EARN formula: Math.round(invoiceTotal * pointsPerRupee)");
    console.log("REDEEM formula: Math.round(amountToRedeem / redeemRupeePerPoint)");
  } catch (error) {
    console.error("\n❌ Error fixing loyalty entries:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await libsqlClient.close();
  }
}

fixDecimalLoyaltyEntries();
