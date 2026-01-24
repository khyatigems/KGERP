
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🌱 Seeding Master Data...');

  // 1. Categories
  const categories = [
    { name: 'Loose Stone', code: 'LOOSE' },
    { name: 'Certified Stone', code: 'CERTIFIED' },
    { name: 'Parcel', code: 'PARCEL' },
    { name: 'Jewelry', code: 'JEWELRY' },
  ];

  for (const cat of categories) {
    await prisma.categoryCode.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories seeded');

  // 2. Gemstones
  const gemstones = [
    { name: 'Diamond', code: 'DIA' },
    { name: 'Ruby (Manik)', code: 'RUBY' },
    { name: 'Blue Sapphire (Neelam)', code: 'BSAP' },
    { name: 'Yellow Sapphire (Pukhraj)', code: 'YSAP' },
    { name: 'Emerald (Panna)', code: 'EMR' },
    { name: 'Pearl (Moti)', code: 'PEARL' },
    { name: 'Red Coral (Moonga)', code: 'CORAL' },
    { name: 'Hessonite (Gomed)', code: 'GOMED' },
    { name: 'Cats Eye (Lehsunia)', code: 'CAT' },
    { name: 'White Sapphire', code: 'WSAP' },
  ];

  for (const gem of gemstones) {
    await prisma.gemstoneCode.upsert({
      where: { code: gem.code },
      update: {},
      create: gem,
    });
  }
  console.log('✅ Gemstones seeded');

  // 3. Colors
  const colors = [
    { name: 'D', code: 'D' },
    { name: 'E', code: 'E' },
    { name: 'F', code: 'F' },
    { name: 'G', code: 'G' },
    { name: 'H', code: 'H' },
    { name: 'I', code: 'I' },
    { name: 'J', code: 'J' },
    { name: 'K', code: 'K' },
    { name: 'L', code: 'L' },
    { name: 'M', code: 'M' },
    { name: 'Fancy', code: 'FANCY' },
    { name: 'White', code: 'WHITE' },
    { name: 'Red', code: 'RED' },
    { name: 'Blue', code: 'BLUE' },
    { name: 'Yellow', code: 'YELLOW' },
    { name: 'Green', code: 'GREEN' },
  ];

  for (const col of colors) {
    await prisma.colorCode.upsert({
      where: { code: col.code },
      update: {},
      create: col,
    });
  }
  console.log('✅ Colors seeded');

  // 4. Cuts
  const cuts = [
    { name: 'Excellent', code: 'EX' },
    { name: 'Very Good', code: 'VG' },
    { name: 'Good', code: 'GD' },
    { name: 'Fair', code: 'FR' },
    { name: 'Poor', code: 'PR' },
    { name: 'Ideal', code: 'ID' },
  ];

  for (const cut of cuts) {
    await prisma.cutCode.upsert({
      where: { code: cut.code },
      update: {},
      create: cut,
    });
  }
  console.log('✅ Cuts seeded');

  // 5. Collections
  const collections = [
    { name: 'Wedding Collection', code: 'WEDDING' },
    { name: 'Engagement Rings', code: 'ENGAGE' },
    { name: 'Office Wear', code: 'OFFICE' },
    { name: 'Party Wear', code: 'PARTY' },
    { name: 'Solitaire', code: 'SOLITAIRE' },
  ];

  for (const coll of collections) {
    await prisma.collectionCode.upsert({
      where: { code: coll.code },
      update: {},
      create: coll,
    });
  }
  console.log('✅ Collections seeded');

  // 6. Rashis
  const rashis = [
    { name: 'Aries (Mesh)', code: 'ARIES' },
    { name: 'Taurus (Vrishabh)', code: 'TAURUS' },
    { name: 'Gemini (Mithun)', code: 'GEMINI' },
    { name: 'Cancer (Kark)', code: 'CANCER' },
    { name: 'Leo (Simha)', code: 'LEO' },
    { name: 'Virgo (Kanya)', code: 'VIRGO' },
    { name: 'Libra (Tula)', code: 'LIBRA' },
    { name: 'Scorpio (Vrishchik)', code: 'SCORPIO' },
    { name: 'Sagittarius (Dhanu)', code: 'SAGITTARIUS' },
    { name: 'Capricorn (Makar)', code: 'CAPRICORN' },
    { name: 'Aquarius (Kumbh)', code: 'AQUARIUS' },
    { name: 'Pisces (Meen)', code: 'PISCES' },
  ];

  for (const rashi of rashis) {
    await prisma.rashiCode.upsert({
      where: { code: rashi.code },
      update: {},
      create: rashi,
    });
  }
  console.log('✅ Rashis seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
