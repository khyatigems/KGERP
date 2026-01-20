import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = createClient({
  url: url,
});

async function run() {
  const columns = [
    "ALTER TABLE Inventory ADD COLUMN braceletType TEXT",
    "ALTER TABLE Inventory ADD COLUMN beadSizeMm REAL",
    "ALTER TABLE Inventory ADD COLUMN beadCount INTEGER",
    "ALTER TABLE Inventory ADD COLUMN holeSizeMm REAL",
    "ALTER TABLE Inventory ADD COLUMN innerCircumferenceMm REAL",
    "ALTER TABLE Inventory ADD COLUMN standardSize TEXT"
  ];

  for (const sql of columns) {
    try {
      console.log(`Running: ${sql}`);
      await client.execute(sql);
      console.log("Success");
    } catch (e) {
      console.log(`Error (might already exist): ${e.message}`);
    }
  }
}

run();
