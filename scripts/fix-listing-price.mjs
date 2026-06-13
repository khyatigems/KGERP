import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const rawUrl = process.env.DATABASE_URL || "";
const normalized = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
const [base, query = ""] = normalized.split("?");
const authToken = new URLSearchParams(query).get("authToken") ?? undefined;
const client = createClient({ url: base, authToken });
const adapter = new PrismaLibSQL(client);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find by externalId (Etsy listing ID 4517456077) - we found it from the search
  const listing = await prisma.listing.findFirst({
    where: { externalId: "4517456077" },
    include: {
      priceHistory: { orderBy: { changedAt: "asc" } },
      inventory: { select: { sku: true, itemName: true, sellingPrice: true } },
    },
  });

  if (!listing) {
    console.log("Listing not found");
    return;
  }

  console.log("=== CURRENT STATE ===");
  console.log(`Listing ID: ${listing.id}`);
  console.log(`Platform: ${listing.platform}`);
  console.log(`SKU: ${listing.inventory.sku}`);
  console.log(`ERP sellingPrice: ${listing.inventory.sellingPrice}`);
  console.log(`listedPrice: ${listing.listedPrice}`);
  console.log(`Price history (${listing.priceHistory.length} entries):`);
  for (const ph of listing.priceHistory) {
    console.log(`  - ID: ${ph.id}, Price: ${ph.price}, Changed by: ${ph.changedBy}, At: ${ph.changedAt}`);
  }

  if (listing.priceHistory.length > 0) {
    const first = listing.priceHistory[0];
    if (first.price !== 6500) {
      const updated = await prisma.listingPriceHistory.update({
        where: { id: first.id },
        data: { price: 6500 },
      });
      console.log(`\n=== FIXED ===`);
      console.log(`Updated priceHistory entry ${updated.id}: ${first.price} -> ${updated.price}`);
    } else {
      console.log(`\nFirst entry already has price ${first.price}, no change needed`);
    }
  }

  console.log("\n=== VERIFY ===");
  const verify = await prisma.listing.findFirst({
    where: { id: listing.id },
    include: {
      priceHistory: { orderBy: { changedAt: "asc" } },
      inventory: { select: { sku: true } },
    },
  });
  console.log(`listedPrice: ${verify.listedPrice}`);
  for (const ph of verify.priceHistory) {
    console.log(`  - Price: ${ph.price}, By: ${ph.changedBy}`);
  }
  console.log(`Original (history[0]): ${verify.priceHistory[0]?.price}`);
  console.log(`Current (listedPrice): ${verify.listedPrice}`);
  const diff = verify.listedPrice - (verify.priceHistory[0]?.price || 0);
  console.log(`Diff: ${diff} (${diff < 0 ? "price dropped" : diff > 0 ? "price increased" : "no change"})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
