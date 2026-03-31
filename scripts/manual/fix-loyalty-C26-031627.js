// Fix loyalty points for customer C26-031627
// Customer ID: 9281b29e-17fb-4d88-ba9b-e9315bb6ab3c

const { config } = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

// Parse LibSQL credentials
function parseLibsqlCredentials(rawUrl) {
  const normalized = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
  const [base, query = ""] = normalized.split("?");
  const authToken =
    new URLSearchParams(query).get("authToken") ||
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    undefined;
  return { url: base, authToken };
}

const { url, authToken } = parseLibsqlCredentials(databaseUrl);
const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);

const prisma = new PrismaClient({ adapter });

async function main() {
  const customerId = "9281b29e-17fb-4d88-ba9b-e9315bb6ab3c";
  const pointsToDeduct = 223.65;
  const invoiceNumber = "INV-2026-0018";
  const reason = "Technical issue resolved";

  console.log(`\n🔧 Fixing loyalty points for customer ${customerId}`);
  console.log(`   Customer Code: C26-031627`);
  console.log(`   Deducting: ${pointsToDeduct} points`);
  console.log(`   Invoice: ${invoiceNumber}`);
  console.log(`   Reason: ${reason}\n`);

  try {
    // Get current loyalty points
    const currentPoints = await prisma.$queryRawUnsafe(
      `SELECT ROUND(COALESCE(SUM(points),0)) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
      customerId
    );
    
    const availablePoints = Number(currentPoints?.[0]?.points || 0);
    console.log(`   Current points balance: ${availablePoints}`);
    
    if (availablePoints < pointsToDeduct) {
      console.error(`   ❌ ERROR: Cannot deduct ${pointsToDeduct} points. Customer only has ${availablePoints} points.`);
      process.exit(1);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Create a REDEEM entry to deduct points
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
       VALUES (?, ?, NULL, 'REDEEM', ?, ?, ?, ?)`,
      id,
      customerId,
      -Math.abs(pointsToDeduct),
      -Math.abs(pointsToDeduct),
      `Adjustment: ${reason} (Invoice: ${invoiceNumber})`,
      now
    );

    console.log(`   ✅ Created adjustment entry: ${id}`);
    console.log(`   ✅ Deducted ${pointsToDeduct} points`);
    console.log(`   ✅ New balance: ${availablePoints - pointsToDeduct}\n`);
    console.log(`🎉 Loyalty points adjustment completed successfully!`);

  } catch (error) {
    console.error("   ❌ ERROR:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
