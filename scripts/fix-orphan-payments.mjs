import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3").verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path to point to dev.db in project root (parent of scripts/)
const dbPath = path.resolve(__dirname, "../dev.db");
console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    process.exit(1);
  }
  console.log("Connected to the SQLite database.");
});

db.serialize(() => {
  // 1. Get Payments
  db.all("SELECT id, invoiceId, amount FROM Payment", [], (err, payments) => {
    if (err) {
      console.error("Error fetching payments:", err.message);
      return;
    }
    console.log(`Total Payments found: ${payments.length}`);

    if (payments.length === 0) {
      console.log("No payments to check.");
      return;
    }

    // 2. Get Invoices
    db.all("SELECT id FROM Invoice", [], (err, invoices) => {
      if (err) {
        console.error("Error fetching invoices:", err.message);
        return;
      }
      
      const invoiceIds = new Set(invoices.map((i) => i.id));
      console.log(`Total Invoices found: ${invoiceIds.size}`);

      // 3. Find Orphans
      const orphans = payments.filter((p) => !invoiceIds.has(p.invoiceId));
      
      if (orphans.length === 0) {
        console.log("✅ No orphan payments found. Data integrity is good.");
      } else {
        console.log(`⚠️ Found ${orphans.length} orphan payments!`);
        
        orphans.forEach((p) => {
          console.log(`   - Orphan Payment: ${p.id} (Invoice ID: ${p.invoiceId}, Amount: ${p.amount})`);
        });

        // 4. Delete Orphans
        console.log("Deleting orphans...");
        const stmt = db.prepare("DELETE FROM Payment WHERE id = ?");
        
        let deletedCount = 0;
        orphans.forEach((p) => {
          stmt.run(p.id, (err) => {
            if (err) console.error(`Failed to delete ${p.id}:`, err.message);
            else {
                deletedCount++;
                console.log(`   - Deleted payment ${p.id}`);
            }
          });
        });
        stmt.finalize(() => {
            console.log(`Cleanup complete. Deleted ${deletedCount} orphan payments.`);
        });
      }
    });
  });
});

// Close connection (will wait for pending queries)
// db.close(); // serialize should handle flow, but keeping it open until callbacks finish is safer
// In sqlite3, close() schedules closing.
// db.close((err) => {
//   if (err) console.error(err.message);
//   console.log('Database connection closed.');
// });
