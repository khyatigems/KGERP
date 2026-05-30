import { prisma } from "../lib/prisma";

async function verifyEbaySettings() {
  try {
    console.log("Checking if EbaySettings table exists in Turso database...");

    // Check if table exists
    const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='EbaySettings'`
    );

    console.log("EbaySettings table check:", tables);

    if (!tables || tables.length === 0) {
      console.log("Table does not exist, creating it...");
      
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "EbaySettings" (
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
        )
      `);

      console.log("✓ Table created");

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

      console.log("✓ Default settings inserted");
    } else {
      console.log("✓ Table already exists");
      
      // Check if there's data
      const count = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
        `SELECT COUNT(*) as c FROM "EbaySettings"`
      );
      console.log("Record count:", count[0].c);
      
      if (count[0].c === 0) {
        console.log("No records found, inserting default...");
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
        console.log("✓ Default settings inserted");
      }
    }

    console.log("\n✓ Done! EbaySettings is ready.");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEbaySettings();
