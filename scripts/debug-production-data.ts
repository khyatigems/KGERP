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
  console.log("Checking Inventory table...");
  
  try {
    const total = await client.execute("SELECT count(*) as count FROM Inventory");
    console.log("Total Inventory Items:", total.rows[0].count);

    const inStock = await client.execute("SELECT count(*) as count FROM Inventory WHERE status = 'IN_STOCK'");
    console.log("In Stock Items:", inStock.rows[0].count);

    const sample = await client.execute("SELECT id, sku, status FROM Inventory LIMIT 5");
    console.log("Sample Items:", sample.rows);

  } catch (e) {
    console.error("Error:", e);
  }
}

main();