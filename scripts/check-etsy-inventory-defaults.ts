import { prisma } from "../lib/prisma";

async function main() {
  const sku = process.argv[2];
  const items = await prisma.inventory.findMany({
    where: sku ? { sku } : { status: "IN_STOCK" },
    orderBy: { updatedAt: "desc" }, take: 12,
    select: { sku: true, itemName: true, etsyDescription: true, imageUrl: true,
      media: { where: { type: "IMAGE" }, select: { id: true } } },
  });
  console.log(JSON.stringify(items.map(({ etsyDescription, imageUrl, media, ...item }) => ({
    ...item, savedDescriptionLength: etsyDescription?.trim().length || 0,
    hasPrimaryImage: Boolean(imageUrl), imageCount: media.length,
  })), null, 2));
}
main().catch(() => { console.error("Inventory check failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
