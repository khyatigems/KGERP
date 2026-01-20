
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

console.log("Checking database connection to:", url.split("?")[0]);

const client = createClient({
  url: url,
  authToken: process.env.TURSO_AUTH_TOKEN, // In case it's needed, though usually embedded in URL for some setups
});

async function checkTables() {
  try {
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tables = result.rows.map(r => r.name);
    console.log("Found tables:", tables);

    const required = ["Inventory", "LabelCartItem", "LabelPrintJob", "User"];
    const missing = required.filter(t => !tables.includes(t));

    if (missing.length > 0) {
      console.error("MISSING TABLES:", missing);
    } else {
      console.log("All required tables present.");
    }
    
    // Check Inventory count
    if (tables.includes("Inventory")) {
        const count = await client.execute("SELECT COUNT(*) as count FROM Inventory");
        console.log("Inventory count:", count.rows[0].count);
    }

  } catch (e) {
    console.error("Error checking tables:", e);
  }
}

checkTables();
