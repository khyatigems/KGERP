import { createClient } from "@libsql/client";

// Hardcoded Turso URL from .env (commented out section)
const url = "libsql://kgerpv3-kgadmin.aws-ap-south-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Njg3MjUyNjcsImlkIjoiMjYzNDYwMjMtZTE0MC00ZGY3LWI1NDUtY2NkNjg5ZTg2MzE2IiwicmlkIjoiYWFmMjRkMmYtZThkMy00OTQ5LWE1N2QtMmE2YjM4ZmZlYmQ0In0.0idoOalryMWXJl73MhGd2xrSh2l2Ru824i3iww7dH98Fch9L6heP7W4mC9KmyfDbVBr26BhnPyVCRX0-1ApjBA";

const client = createClient({
  url,
  authToken,
});

async function main() {
  console.log("Checking for orphan payments in Turso DB (Optimized)...");

  try {
    // Single query to find orphans
    const result = await client.execute(`
        SELECT Payment.id, Payment.invoiceId, Payment.amount 
        FROM Payment 
        LEFT JOIN Invoice ON Payment.invoiceId = Invoice.id 
        WHERE Invoice.id IS NULL
    `);
    
    const orphans = result.rows;

    if (orphans.length === 0) {
      console.log("✅ No orphan payments found in Turso. Data integrity is good.");
    } else {
      console.log(`⚠️ Found ${orphans.length} orphan payments!`);
      
      orphans.forEach(p => {
        console.log(`   - Orphan Payment: ${p.id} (Invoice ID: ${p.invoiceId}, Amount: ${p.amount})`);
      });

      // 4. Delete orphans
      console.log("\nDeleting orphan payments...");
      for (const orphan of orphans) {
        try {
            await client.execute({
                sql: "DELETE FROM Payment WHERE id = ?",
                args: [orphan.id]
            });
            console.log(`   - Deleted Payment ${orphan.id}`);
        } catch (delErr) {
            console.error(`Failed to delete ${orphan.id}:`, delErr);
        }
      }
      console.log("Cleanup complete.");
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
