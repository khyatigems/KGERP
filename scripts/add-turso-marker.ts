import { prisma } from "../lib/prisma";

async function main() {
  console.log("Adding Turso marker to database...");
  
  try {
    // Check if Setting model exists in client by trying to access it
    // If it doesn't exist, this will throw or fail type check
    // But since it's used in dashboard route, it should be fine.
    
    await prisma.setting.upsert({
      where: { key: "DATABASE_SOURCE" },
      update: { value: "TURSO_CLOUD_DB" },
      create: {
        key: "DATABASE_SOURCE",
        value: "TURSO_CLOUD_DB"
      }
    });
    console.log("✅ Turso marker added: DATABASE_SOURCE = TURSO_CLOUD_DB");
  } catch (e) {
    console.error("❌ Failed to add Turso marker:", e);
  }
}

main();
