import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3").verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Check tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log("Tables found:", tables.map(t => t.name).join(", "));
    
    // Check Payment count
    db.get("SELECT count(*) as count FROM Payment", (err, row) => {
        if (err) console.error("Error counting Payment:", err.message);
        else console.log(`Payment count: ${row.count}`);
    });

    // Check Invoice count
    db.get("SELECT count(*) as count FROM Invoice", (err, row) => {
        if (err) console.error("Error counting Invoice:", err.message);
        else console.log(`Invoice count: ${row.count}`);
    });
  });
});
