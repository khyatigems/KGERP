import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cachedMasters } from "@/lib/cache";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { BulkEditManager } from "@/components/inventory/bulk-edit-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulk Edit | KhyatiGems",
};

export default async function BulkEditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const hasPerm = await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT);
  if (!hasPerm) redirect("/inventory");

  const sp = await searchParams;
  const ids = Array.isArray(sp.id) ? sp.id : sp.id ? [sp.id] : [];

  if (ids.length === 0) redirect("/inventory");

  const inventoryItems = await prisma.inventory.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      sku: true,
      itemName: true,
      category: true,
      gemType: true,
      color: true,
      shape: true,
      cutCodeId: true,
      origin: true,
      fluorescence: true,
      treatment: true,
      transparency: true,
      categoryCodeId: true,
      gemstoneCodeId: true,
      colorCodeId: true,
      vendorId: true,
      collectionCodeId: true,
      stockLocation: true,
      status: true,
      categoryCode: { select: { id: true, name: true } },
      gemstoneCode: { select: { id: true, name: true } },
      colorCode: { select: { id: true, name: true } },
      cutCode: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      collectionCode: { select: { id: true, name: true } },
    },
    orderBy: { sku: "asc" },
  });

  const [
    categories,
    gemstones,
    colors,
    vendors,
    collections,
    rashis,
    certificates,
    cuts,
  ] = await Promise.all([
    cachedMasters.getCategories(prisma)(),
    cachedMasters.getGemstones(prisma)(),
    cachedMasters.getColors(prisma)(),
    cachedMasters.getVendors(prisma)(),
    cachedMasters.getCollections(prisma)(),
    cachedMasters.getRashis(prisma)(),
    cachedMasters.getCertificates(prisma)(),
    cachedMasters.getCuts(prisma)(),
  ]);

  const originRows = await prisma.$queryRawUnsafe<Array<{ origin: string }>>(
    `SELECT DISTINCT "origin" FROM "Inventory" WHERE "origin" IS NOT NULL AND "origin" <> '' ORDER BY "origin"`
  );
  const origins = originRows.map((r) => r.origin);

  return (
    <BulkEditManager
      items={inventoryItems}
      masterData={{ categories, gemstones, colors, vendors, collections, rashis, certificates, cuts }}
      origins={origins}
    />
  );
}
