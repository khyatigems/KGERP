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
  console.log("Checking tables...");
  
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.rows.map(r => r.name);
    console.log("Tables found:", tableNames);

    const hasColorCode = tableNames.includes("ColorCode");
    console.log("Has ColorCode table:", hasColorCode);
    
    if (hasColorCode) {
        const count = await client.execute("SELECT count(*) as c FROM ColorCode");
        console.log("ColorCode rows:", count.rows[0].c);
    }

  } catch (e) {
    console.error("Error:", e);
  }
}

main();