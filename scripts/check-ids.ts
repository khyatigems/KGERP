
import { prisma } from "@/lib/prisma";

async function checkCodes() {
  const gems = await prisma.gemstoneCode.findMany();
  const cats = await prisma.categoryCode.findMany();
  const colors = await prisma.colorCode.findMany();
  const cuts = await prisma.cutCode.findMany();

  const check = (name: string, items: { id: string }[]) => {
      const invalid = items.filter(g => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(g.id));
      if (invalid.length > 0) {
        console.log(`Found invalid IDs in ${name}:`, invalid.map(i => i.id));
      } else {
        console.log(`All IDs in ${name} are valid UUIDs.`);
      }
  };

  check("Gemstones", gems);
  check("Categories", cats);
  check("Colors", colors);
  check("Cuts", cuts);
}

checkCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
