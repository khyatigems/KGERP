import { createClient } from "@libsql/client";

const rawUrl = process.env.DATABASE_URL || "";
if (!rawUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const normalizedUrl = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
const clientUrl = normalizedUrl.split("?")[0];
const authToken = new URLSearchParams(normalizedUrl.split("?")[1] || "").get("authToken") || undefined;

const client = createClient({
  url: clientUrl,
  authToken,
});

const statements = [
  `ALTER TABLE "Sale" ADD COLUMN "billingAddress" TEXT`,
  `ALTER TABLE "Sale" ADD COLUMN "placeOfSupply" TEXT`,
  `ALTER TABLE "Sale" ADD COLUMN "shippingAddress" TEXT`,
  `ALTER TABLE "Sale" ADD COLUMN "shippingCharge" REAL NOT NULL DEFAULT 0`,
  `ALTER TABLE "Sale" ADD COLUMN "additionalCharge" REAL NOT NULL DEFAULT 0`,
];

const run = async () => {
  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.includes("duplicate column name") && !message.includes("already exists")) {
        console.error("Failed:", statement);
        console.error(message);
        process.exit(1);
      }
    }
  }
  console.log("Sale columns patched successfully.");
};

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
