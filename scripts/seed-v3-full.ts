
import { prisma } from '../lib/prisma';
import { hash } from 'bcryptjs';

// const prisma = new PrismaClient(); // Removed local instance to use shared custom client

async function main() {
  console.log('🌱 Starting V3 Full Seeding...');

  // 1. CLEANUP (Optional - be careful in prod, but good for dev)
  try {
    await prisma.inventoryMedia.deleteMany();
    await prisma.companySettings.deleteMany();
    await prisma.paymentSettings.deleteMany();
    await prisma.quotationItem.deleteMany();
    await prisma.quotation.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.listing.deleteMany();
    // await prisma.inventory.deleteMany();
    // await prisma.vendor.deleteMany();
    // await prisma.user.deleteMany();
    // await prisma.categoryCode.deleteMany();
    // await prisma.gemstoneCode.deleteMany();
    // await prisma.colorCode.deleteMany();
    // await prisma.cutCode.deleteMany();
    // await prisma.collectionCode.deleteMany();
    // await prisma.rashiCode.deleteMany();
    // await prisma.customer.deleteMany();
  } catch (error) {
    console.warn("Cleanup warning (tables might be missing):", error);
  }

  // 2. USERS
  const passwordHash = await hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@khyatigems.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@khyatigems.com',
      password: passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@khyatigems.com' },
    update: {},
    create: {
      name: 'Sales Executive',
      email: 'sales@khyatigems.com',
      password: passwordHash,
      role: 'SALES',
    },
  });

  console.log('✅ Users created');

  // 3. VENDORS
  const vendor1 = await prisma.vendor.upsert({
    where: { name: 'Ratna Global Exports' },
    update: {},
    create: {
      name: 'Ratna Global Exports',
      vendorType: 'Manufacturer',
      city: 'Jaipur',
      status: 'APPROVED',
      phone: '+919876543210'
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { name: 'Shree Gems' },
    update: {},
    create: {
      name: 'Shree Gems',
      vendorType: 'Wholesaler',
      city: 'Mumbai',
      status: 'APPROVED',
      phone: '+919876543211'
    },
  });

  console.log('✅ Vendors created');

  // 4. CODE MASTERS
  // Categories
  const catLoose = await prisma.categoryCode.upsert({ where: { code: 'CAT-LOOSE' }, update: {}, create: { name: 'Loose Gemstone', code: 'CAT-LOOSE' } });
  const catRing = await prisma.categoryCode.upsert({ where: { code: 'CAT-RING' }, update: {}, create: { name: 'Ring', code: 'CAT-RING' } });
  await prisma.categoryCode.upsert({ where: { code: 'CAT-PEND' }, update: {}, create: { name: 'Pendant', code: 'CAT-PEND' } });

  // Gemstones
  const gemBlueSapphire = await prisma.gemstoneCode.upsert({ where: { code: 'GEM-BS' }, update: {}, create: { name: 'Blue Sapphire', code: 'GEM-BS' } });
  const gemEmerald = await prisma.gemstoneCode.upsert({ where: { code: 'GEM-EM' }, update: {}, create: { name: 'Emerald', code: 'GEM-EM' } });
  const gemRuby = await prisma.gemstoneCode.upsert({ where: { code: 'GEM-RB' }, update: {}, create: { name: 'Ruby', code: 'GEM-RB' } });

  // Colors
  const colRoyalBlue = await prisma.colorCode.upsert({ where: { code: 'COL-RBL' }, update: {}, create: { name: 'Royal Blue', code: 'COL-RBL' } });
  const colVividGreen = await prisma.colorCode.upsert({ where: { code: 'COL-VGR' }, update: {}, create: { name: 'Vivid Green', code: 'COL-VGR' } });
  const colPigeonBlood = await prisma.colorCode.upsert({ where: { code: 'COL-PBL' }, update: {}, create: { name: 'Pigeon Blood Red', code: 'COL-PBL' } });

  // Cuts
  const cutOval = await prisma.cutCode.upsert({ where: { code: 'CUT-OVL' }, update: {}, create: { name: 'Oval Mixed', code: 'CUT-OVL' } });
  const cutEmerald = await prisma.cutCode.upsert({ where: { code: 'CUT-EMR' }, update: {}, create: { name: 'Emerald Cut', code: 'CUT-EMR' } });
  const cutRound = await prisma.cutCode.upsert({ where: { code: 'CUT-RND' }, update: {}, create: { name: 'Round Brilliant', code: 'CUT-RND' } });

  // Collections
  const colExclusive = await prisma.collectionCode.upsert({ where: { code: 'COLL-EX' }, update: {}, create: { name: 'Exclusive Collection', code: 'COLL-EX' } });
  const colStandard = await prisma.collectionCode.upsert({ where: { code: 'COLL-STD' }, update: {}, create: { name: 'Standard Inventory', code: 'COLL-STD' } });

  // Rashis (Zodiac)
  const rashiKumbh = await prisma.rashiCode.upsert({ where: { code: 'RASHI-KUM' }, update: {}, create: { name: 'Kumbh (Aquarius)', code: 'RASHI-KUM' } });
  const rashiMakar = await prisma.rashiCode.upsert({ where: { code: 'RASHI-MAK' }, update: {}, create: { name: 'Makar (Capricorn)', code: 'RASHI-MAK' } });
  const rashiMithun = await prisma.rashiCode.upsert({ where: { code: 'RASHI-MIT' }, update: {}, create: { name: 'Mithun (Gemini)', code: 'RASHI-MIT' } });

  console.log('✅ Code Masters created');

  // 5. INVENTORY
  // Item 1: Blue Sapphire
  const inv1 = await prisma.inventory.upsert({
    where: { sku: 'BS-001' },
    update: {},
    create: {
      sku: 'BS-001',
      itemName: 'Royal Blue Sapphire 5.2ct',
      category: 'Loose Gemstone', // Legacy string field
      gemType: 'Blue Sapphire',   // Legacy string field
      
      // Linking Codes
      categoryCode: { connect: { id: catLoose.id } },
      gemstoneCode: { connect: { id: gemBlueSapphire.id } },
      colorCode: { connect: { id: colRoyalBlue.id } },
      cutCode: { connect: { id: cutOval.id } },
      collectionCode: { connect: { id: colExclusive.id } },
      
      rashis: {
        connect: [{ id: rashiKumbh.id }, { id: rashiMakar.id }]
      },

      weightValue: 5.2,
      carats: 5.2,
      weightUnit: 'Carat',
      pricingMode: 'PER_CARAT',
      purchaseRatePerCarat: 15000,
      sellingRatePerCarat: 25000,
      costPrice: 78000, // 5.2 * 15000
      sellingPrice: 130000, // 5.2 * 25000
      
      vendorId: vendor1.id,
      status: 'IN_STOCK',
      
      treatment: 'Heated',
      certification: 'GIA Certified'
    }
  });

  // Item 2: Emerald Ring
  const inv2 = await prisma.inventory.upsert({
    where: { sku: 'EM-R-002' },
    update: {},
    create: {
      sku: 'EM-R-002',
      itemName: 'Zambian Emerald Gold Ring',
      category: 'Ring',
      gemType: 'Emerald',
      
      categoryCode: { connect: { id: catRing.id } },
      gemstoneCode: { connect: { id: gemEmerald.id } },
      colorCode: { connect: { id: colVividGreen.id } },
      cutCode: { connect: { id: cutEmerald.id } },
      collectionCode: { connect: { id: colStandard.id } },
      
      rashis: {
        connect: [{ id: rashiMithun.id }]
      },

      weightValue: 3.5,
      carats: 0,
      weightUnit: 'Grams',
      pricingMode: 'FLAT',
      flatPurchaseCost: 45000,
      flatSellingPrice: 85000,
      costPrice: 45000,
      sellingPrice: 85000,
      
      vendorId: vendor2.id,
      status: 'IN_STOCK',
      
      treatment: 'Minor Oil',
      certification: 'IGI'
    }
  });

  // Item 3: Ruby (Sold)
  const inv3 = await prisma.inventory.upsert({
    where: { sku: 'RB-003' },
    update: {},
    create: {
      sku: 'RB-003',
      itemName: 'Burmese Ruby 2.1ct',
      category: 'Loose Gemstone',
      gemType: 'Ruby',
      
      categoryCode: { connect: { id: catLoose.id } },
      gemstoneCode: { connect: { id: gemRuby.id } },
      colorCode: { connect: { id: colPigeonBlood.id } },
      cutCode: { connect: { id: cutRound.id } },
      collectionCode: { connect: { id: colExclusive.id } },
      
      weightValue: 2.1,
      carats: 2.1,
      weightUnit: 'Carat',
      pricingMode: 'PER_CARAT',
      purchaseRatePerCarat: 50000,
      sellingRatePerCarat: 80000,
      costPrice: 105000,
      sellingPrice: 168000,
      
      vendorId: vendor1.id,
      status: 'SOLD',
      
      treatment: 'Unheated',
      certification: 'GRS'
    }
  });

  console.log('✅ Inventory created');

  // 6. CUSTOMERS
  const cust1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Kumar',
      phone: '+919876543212',
      email: 'rajesh@example.com',
      city: 'Delhi',
      state: 'Delhi',
      notes: 'VIP Client'
    }
  });

  console.log('✅ Customers created');

  // 7. QUOTATIONS
  // Draft Quote
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QTN-2026-0001',
      customerId: cust1.id,
      customerName: cust1.name,
      customerMobile: cust1.phone,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      totalAmount: 130000, // 5.2 * 25000
      token: 'TOKEN-001',
      createdById: salesUser.id,
      items: {
        create: [{
          inventoryId: inv1.id,
          quotedPrice: 130000
        }]
      }
    }
  });

  // Sent Quote (with discount)
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QTN-2026-0002',
      customerName: 'Priya Singh', // Ad-hoc customer
      customerMobile: '+919876543213',
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'SENT',
      totalAmount: 80000, 
      token: 'TOKEN-002',
      createdById: admin.id,
      items: {
        create: [{
          inventoryId: inv2.id,
          quotedPrice: 80000
        }]
      }
    }
  });

  console.log('✅ Quotations created');

  // 8. SALES
  const invoice = await prisma.invoice.create({
    data: {
        invoiceNumber: 'INV-2026-0001',
        token: 'seed-token-123',
        subtotal: 168000,
        taxTotal: 0,
        discountTotal: 0,
        totalAmount: 168000,
        status: 'PAID'
    }
  });

  await prisma.sale.create({
    data: {
      inventoryId: inv3.id, // The Ruby
      platform: 'WEBSITE',
      saleDate: new Date(),
      customerName: 'Amit Patel',
      salePrice: 168000, // 2.1 * 80000
      netAmount: 168000,
      profit: 63000, // (80k - 50k) * 2.1
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      invoiceId: invoice.id
    }
  });

  console.log('✅ Sales created');

  // 9. LISTINGS
  await prisma.listing.create({
    data: {
      inventoryId: inv1.id,
      platform: 'WEBSITE',
      listedPrice: 135000, // Slightly higher than ERP
      status: 'ACTIVE'
    }
  });

  console.log('✅ Listings created');

  // 10. COMPANY SETTINGS & BRANDING
  await prisma.companySettings.create({
    data: {
      companyName: 'Khyati Precious Gems Pvt. Ltd.',
      logoUrl: 'https://placehold.co/200x80/0f172a/ffffff/png?text=Khyati+Gems', // Placeholder
      address: '123, Jewel Street, Zaveri Bazaar, Mumbai - 400002',
      phone: '+919876543210',
      email: 'support@khyatigems.com',
      website: 'www.khyatigems.com',
      gstin: '27AABCU9603R1ZM'
    }
  });

  // 11. PAYMENT SETTINGS
  await prisma.paymentSettings.create({
    data: {
      upiEnabled: true,
      upiId: 'khyatigems@okhdfcbank',
      upiPayeeName: 'Khyati Gems Pvt Ltd',
      bankEnabled: true,
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      accountHolder: 'Khyati Precious Gems Pvt. Ltd.'
    }
  });

  console.log('✅ Company & Payment Settings created');

  // 12. INVENTORY MEDIA
  // Add media to Blue Sapphire
  await prisma.inventoryMedia.create({
    data: {
      inventoryId: inv1.id,
      type: 'image',
      mediaUrl: 'https://placehold.co/600x400/0000FF/FFFFFF/png?text=Blue+Sapphire',
      isPrimary: true
    }
  });

  // Add media to Emerald Ring
  await prisma.inventoryMedia.create({
    data: {
      inventoryId: inv2.id,
      type: 'image',
      mediaUrl: 'https://placehold.co/600x400/008000/FFFFFF/png?text=Emerald+Ring',
      isPrimary: true
    }
  });

  console.log('✅ Inventory Media created');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
