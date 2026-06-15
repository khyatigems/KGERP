import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";

const EXPORT_FIELDS: Record<string, { label: string; getter: (item: Record<string, unknown>) => unknown }> = {
  sku: { label: "SKU", getter: (i) => i.sku },
  itemName: { label: "Item Name", getter: (i) => i.itemName },
  internalName: { label: "Internal Name", getter: (i) => i.internalName || "" },
  category: { label: "Category", getter: (i) => i.category },
  gemType: { label: "Gem Type", getter: (i) => i.gemType || "" },
  color: { label: "Color", getter: (i) => i.color || "" },
  shape: { label: "Shape", getter: (i) => i.shape || "" },
  weightValue: { label: "Weight (cts)", getter: (i) => i.weightValue },
  weightUnit: { label: "Weight Unit", getter: (i) => i.weightUnit },
  weightRatti: { label: "Ratti", getter: (i) => i.weightRatti },
  dimensionsMm: { label: "Dimensions", getter: (i) => i.dimensionsMm },
  pricingMode: { label: "Pricing Mode", getter: (i) => i.pricingMode },
  sellingRatePerCarat: { label: "Selling Rate/Carat", getter: (i) => i.sellingRatePerCarat },
  sellingPrice: { label: "Selling Price", getter: (i) => i.sellingPrice || i.flatSellingPrice },
  flatSellingPrice: { label: "Flat Selling Price", getter: (i) => i.flatSellingPrice },
  status: { label: "Status", getter: (i) => i.status },
  stockLocation: { label: "Location", getter: (i) => i.stockLocation },
  vendorName: { label: "Vendor", getter: (i) => (i as { vendor?: { name?: string } }).vendor?.name || "" },
  certificateNo: { label: "Cert No", getter: (i) => i.certificateNo || i.certificateNumber || "" },
  certification: { label: "Certification", getter: (i) => i.certification || "" },
  imageUrl: { label: "Image URL", getter: (i) => i.imageUrl || "" },
  notes: { label: "Notes", getter: (i) => i.notes || "" },
  createdAt: { label: "Created At", getter: (i) => i.createdAt ? new Date(i.createdAt as string).toISOString().split("T")[0] : "" },
  updatedAt: { label: "Updated At", getter: (i) => i.updatedAt ? new Date(i.updatedAt as string).toISOString().split("T")[0] : "" },
};

function buildFilterWhere(sp: URLSearchParams): Prisma.InventoryWhereInput {
  const and: Prisma.InventoryWhereInput[] = [];
  const direct: Prisma.InventoryWhereInput = {};

  const query = sp.get("query")?.trim();
  const status = sp.get("status");
  const category = sp.get("category");
  const gemType = sp.get("gemType");
  const color = sp.get("color");
  const vendorId = sp.get("vendorId");
  const collectionId = sp.get("collectionId");
  const rashiId = sp.get("rashiId");
  const weightRange = sp.get("weightRange");
  const filter = sp.get("filter");

  if (query) {
    and.push({
      OR: [
        { sku: { contains: query } },
        { itemName: { contains: query } },
        { internalName: { contains: query } },
        { category: { contains: query } },
        { gemType: { contains: query } },
        { color: { contains: query } },
      ],
    });
  }

  if (status && status !== "ALL") direct.status = status;
  if (vendorId && vendorId !== "ALL") direct.vendorId = vendorId;
  if (category && category !== "ALL") direct.category = category;
  if (gemType && gemType !== "ALL") direct.gemType = gemType;
  if (color && color !== "ALL") direct.color = color;
  if (collectionId && collectionId !== "ALL") direct.collectionCodeId = collectionId;
  if (rashiId && rashiId !== "ALL") {
    and.push({ rashis: { some: { id: rashiId } } });
  }

  if (weightRange && weightRange !== "ALL") {
    const [minRaw, maxRaw] = weightRange.split("-");
    const min = Number(minRaw);
    const max = Number(maxRaw);
    if (Number.isFinite(min) && maxRaw === "plus") direct.weightValue = { gte: min };
    else if (Number.isFinite(min) && Number.isFinite(max)) direct.weightValue = { gte: min, lte: max };
  }

  if (filter === "missingImages") {
    and.push({ imageUrl: null, status: "IN_STOCK", hideFromAttention: false, media: { none: {} } });
  } else if (filter === "readyToSell") {
    and.push({
      status: "IN_STOCK",
      AND: [
        { OR: [{ imageUrl: { not: null } }, { media: { some: {} } }] },
        { OR: [{ certification: { not: null } }, { certificateNo: { not: null } }, { certificateNumber: { not: null } }, { lab: { not: null } }] },
      ],
    });
  } else if (filter === "missingCertification") {
    and.push({ status: "IN_STOCK", hideFromAttention: false, certification: null, certificateNo: null, certificateNumber: null, lab: null, OR: [{ imageUrl: { not: null } }, { media: { some: {} } }] });
  } else if (filter === "highValueUnsold") {
    and.push({ sellingPrice: { gt: 100000 }, status: "IN_STOCK", hideFromAttention: false });
  } else if (filter === "stagnant") {
    and.push({ status: "IN_STOCK", hideFromAttention: false, createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } });
  } else if (filter === "newArrivals") {
    and.push({ status: "IN_STOCK", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
  } else if (filter === "missingHsn") {
    and.push({ OR: [{ hsnCode: null }, { hsnCode: "" }] });
  }

  if (Object.keys(direct).length > 0) and.push(direct);
  return and.length ? { AND: and } : {};
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canExport = await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_VIEW);
    if (!canExport) return NextResponse.json({ error: "Permission denied" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const where = buildFilterWhere(searchParams);

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
        media: { select: { mediaUrl: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const fieldKeys = Object.keys(EXPORT_FIELDS);
    const exportData = inventory.map((item) => {
      const row: Record<string, unknown> = {};
      fieldKeys.forEach((key) => {
        const mapping = EXPORT_FIELDS[key];
        if (mapping) row[mapping.label] = mapping.getter(item as unknown as Record<string, unknown>);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Inventory");

    const colWidths = fieldKeys.map((key) => {
      const label = EXPORT_FIELDS[key].label;
      const maxLen = exportData.reduce((max, row) => Math.max(max, String(row[label] || "").length), label.length);
      return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet["!cols"] = colWidths;

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-filtered-export-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Filtered export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
