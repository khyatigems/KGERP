import { prisma } from "../lib/prisma";

async function createEbaySettingsTable() {
  try {
    console.log("Creating EbaySettings table in Turso database...");

    // Create the table using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EbaySettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "globalBannerImages" TEXT,
        "categoryImageUrls" TEXT,
        "maxImagesPerCategory" INTEGER NOT NULL DEFAULT 4,
        "imagesPerDescription" INTEGER NOT NULL DEFAULT 2,
        "imageRotationMode" TEXT NOT NULL DEFAULT 'RANDOM',
        "brandLogoUrl" TEXT,
        "companyName" TEXT,
        "tagline" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✓ EbaySettings table created successfully");

    // Check if there's already a settings record
    const existingSettings = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "EbaySettings" LIMIT 1`
    );

    if (!existingSettings || existingSettings.length === 0) {
      console.log("Creating default EbaySettings record...");
      const defaultImages = JSON.stringify([
        "https://images.unsplash.com/photo-1779786000796-effa1636a7fb?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "https://images.unsplash.com/photo-1779786410107-f1729039bb01?q=80&w=1460&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      ]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "EbaySettings" (
          "id",
          "globalBannerImages",
          "companyName",
          "tagline",
          "imageRotationMode",
          "maxImagesPerCategory",
          "imagesPerDescription",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'default',
          ?,
          'KhyatiGems',
          'Precious Gems for your Precious Ones',
          'RANDOM',
          4,
          2,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `, defaultImages);

      console.log("✓ Default EbaySettings record created");
    } else {
      console.log("✓ EbaySettings record already exists");
    }

    console.log("\n✓ Done! EbaySettings table is ready.");
  } catch (error) {
    console.error("Error creating EbaySettings table:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createEbaySettingsTable();
