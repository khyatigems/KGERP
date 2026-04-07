import { ensureInvoiceSupportSchema } from "@/lib/prisma";

async function main() {
  console.log("Running schema migration...");
  await ensureInvoiceSupportSchema(true);
  console.log("Schema migration complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
