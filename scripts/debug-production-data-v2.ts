import { createClient } from "@libsql/client";

const url = process.argv[2];

if (!url) {
  console.error("Please provide connection string");
  process.exit(1);
}

const client = createClient({
  url: url.replace("libsql://libsql://", "libsql://"),
});

async function main() {
  console.log("Checking Inventory table details...");
  
  try {
    const sample = await client.execute("SELECT id, sku, status, createdAt FROM Inventory WHERE status = 'IN_STOCK' ORDER BY createdAt DESC LIMIT 5");
    console.log("Sample Items (createdAt):", sample.rows);

    // Check if createdAt is null for any in-stock item
    const nullCreatedAt = await client.execute("SELECT count(*) as count FROM Inventory WHERE status = 'IN_STOCK' AND createdAt IS NULL");
    console.log("Items with NULL createdAt:", nullCreatedAt.rows[0].count);

  } catch (e) {
    console.error("Error:", e);
  }
}

main();