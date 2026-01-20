
import { prisma } from '@/lib/prisma';

async function main() {
  console.log('Validating database connection...');
  
  try {
    // Check connection by counting users
    const userCount = await prisma.user.count();
    console.log(`✅ Successfully connected to database.`);
    console.log(`📊 Found ${userCount} users.`);

    // Check inventory count
    const inventoryCount = await prisma.inventory.count();
    console.log(`💎 Found ${inventoryCount} inventory items.`);

    // Check listings count
    const listingCount = await prisma.listing.count();
    console.log(`📋 Found ${listingCount} listings.`);

    // Check vendor count
    const vendorCount = await prisma.vendor.count();
    console.log(`🏭 Found ${vendorCount} vendors.`);

    if (inventoryCount === 0 && userCount === 0) {
      console.warn('⚠️  Database seems empty. Are you sure this is the production database?');
    } else {
      console.log('✅ Data persistence verified.');
    }

  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
