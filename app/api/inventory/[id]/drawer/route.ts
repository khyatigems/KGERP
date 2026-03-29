import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const item = await prisma.inventory.findUnique({
    where: { id },
    include: {
      media: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      categoryCode: { select: { name: true } },
      gemstoneCode: { select: { name: true } },
      colorCode: { select: { name: true } },
      cutCode: { select: { name: true } },
      collectionCode: { select: { name: true } },
      rashis: { select: { name: true } },
      certificates: { select: { name: true, remarks: true } },
      vendor: { select: { id: true, name: true } },
    },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: item.id,
    sku: item.sku,
    itemName: item.itemName,
    internalName: item.internalName,
    status: item.status,
    category: item.category,
    gemType: item.gemType,
    shape: item.shape,
    color: item.colorCode?.name || item.color,
    cut: item.cutCode?.name || item.cut,
    transparency: item.transparency,
    treatment: item.treatment,
    origin: item.origin,
    fluorescence: item.fluorescence,
    weightValue: item.weightValue,
    weightUnit: item.weightUnit,
    weightRatti: item.weightRatti,
    dimensionsMm: item.dimensionsMm,
    beadSizeMm: item.beadSizeMm,
    beadCount: item.beadCount,
    innerCircumferenceMm: item.innerCircumferenceMm,
    pricingMode: item.pricingMode,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    purchaseRatePerCarat: item.purchaseRatePerCarat,
    sellingRatePerCarat: item.sellingRatePerCarat,
    flatPurchaseCost: item.flatPurchaseCost,
    flatSellingPrice: item.flatSellingPrice,
    vendor: item.vendor,
    stockLocation: item.stockLocation,
    certificates: item.certificates || [],
    certificateNo: item.certificateNo,
    certificateNumber: item.certificateNumber,
    collection: item.collectionCode?.name || null,
    rashis: item.rashis?.map((r) => r.name) || [],
    notes: item.notes,
    certificateComments: item.certificateComments,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    media: (item.media || []).map((m) => ({
      id: m.id,
      type: m.type,
      mediaUrl: m.mediaUrl,
      isPrimary: m.isPrimary,
    })),
  });
}
