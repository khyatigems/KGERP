import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type PrismaRecord = Record<string, unknown>;
type PackagingSettingsRow = { categoryHsnJson?: string | null };
type PackagingSettingsDelegate = { findFirst: (args?: PrismaRecord) => Promise<PackagingSettingsRow | null> };
type PackagingPrismaClient = typeof prisma & { gpisSettings: PackagingSettingsDelegate };
const packagingPrisma = prisma as unknown as PackagingPrismaClient;

function parseCategoryHsnJson(input: unknown): Record<string, string> {
  if (typeof input !== "string" || !input.trim()) return {};
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== "string") continue;
      if (typeof v !== "string") continue;
      const key = k.trim();
      const val = v.trim();
      if (!key || !val) continue;
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

const toNumber = (value: string | null) => {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toDate = (value: string | null) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Allow dashboard widgets to load stats for authenticated users

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || sp.get("query") || "").trim();
  const category = (sp.get("category") || "").trim();
  const gemType = (sp.get("gemType") || "").trim();
  const color = (sp.get("color") || "").trim();
  const status = (sp.get("status") || "").trim();
  const vendorId = (sp.get("vendorId") || "").trim();
  const weightRange = (sp.get("weightRange") || "").trim();

  const minPrice = toNumber(sp.get("minPrice"));
  const maxPrice = toNumber(sp.get("maxPrice"));
  const createdFrom = toDate(sp.get("createdFrom"));
  const createdTo = toDate(sp.get("createdTo"));

  const where: Prisma.InventoryWhereInput = {};

  if (status) where.status = status;
  if (category) where.category = category;
  if (gemType) where.gemType = gemType;
  if (color) where.color = color;
  if (vendorId) where.vendorId = vendorId;

  if (weightRange) {
    const [min, max] = weightRange.split("-");
    const minN = Number(min);
    if (Number.isFinite(minN)) {
      if (max === "plus") {
        where.weightValue = { gte: minN };
      } else {
        const maxN = Number(max);
        if (Number.isFinite(maxN)) where.weightValue = { gte: minN, lte: maxN };
      }
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.sellingPrice = {
      gte: minPrice,
      lte: maxPrice,
    };
  }

  if (createdFrom || createdTo) {
    where.createdAt = {
      gte: createdFrom,
      lte: createdTo,
    };
  }

  if (q) {
    const or = [
      { sku: { contains: q } },
      { itemName: { contains: q } },
      { internalName: { contains: q } },
      { category: { contains: q } },
      { gemType: { contains: q } },
      { color: { contains: q } },
      { dimensionsMm: { contains: q } },
      { standardSize: { contains: q } },
      { certificateNo: { contains: q } },
      { certificateNumber: { contains: q } },
      { notes: { contains: q } },
      { beadSizeLabel: { contains: q } } as unknown as Prisma.InventoryWhereInput,
    ] as Prisma.InventoryWhereInput[];
    (where as unknown as { OR?: Prisma.InventoryWhereInput[] }).OR = or;
  }

  // const now = new Date();

  const overallWhere: Prisma.InventoryWhereInput = { ...where };
  delete (overallWhere as unknown as { status?: string }).status;

  const imagesWhere = {
    ...where,
    OR: [
      { imageUrl: { not: null } },
      { media: { some: {} } },
    ],
  } as unknown as Prisma.InventoryWhereInput;

  const certificateWhere = {
    ...where,
    OR: [
      { certificateNo: { not: null } },
      { certificateNumber: { not: null } },
      { certification: { not: null } },
      { lab: { not: null } },
    ],
  } as unknown as Prisma.InventoryWhereInput;

  const categoryHsnMap = parseCategoryHsnJson((await packagingPrisma.gpisSettings.findFirst())?.categoryHsnJson ?? null);
  const mappedCategories = Object.keys(categoryHsnMap).filter(Boolean);

  const hsnFieldWhere = {
    ...where,
    AND: [
      { hsnCode: { not: null } },
      { hsnCode: { not: "" } },
    ],
  } satisfies Prisma.InventoryWhereInput;

  const hsnMappedWhere = mappedCategories.length
    ? ({ ...where, category: { in: mappedCategories } } satisfies Prisma.InventoryWhereInput)
    : ({ ...where, id: { equals: "__NO_MATCH__" } } satisfies Prisma.InventoryWhereInput);

  const hsnReadyWhere = mappedCategories.length
    ? ({
        ...where,
        OR: [hsnFieldWhere, hsnMappedWhere],
      } as unknown as Prisma.InventoryWhereInput)
    : hsnFieldWhere;

  const completenessWhere = {
    AND: [
      imagesWhere,
      certificateWhere,
      hsnReadyWhere,
    ],
  } as unknown as Prisma.InventoryWhereInput;

  const [
    totalItems,
    sums,
    byCategory,
    byGemType,
    byCategoryGemType,
    byStatus,
    withImagesCount,
    withCertificateCount,
    withHsnCount,
    completenessAllCount,
    overallTotalItems,
    overallByStatus
  ] = await Promise.all([
    prisma.inventory.count({ where }),
    prisma.inventory.aggregate({ where, _sum: { sellingPrice: true } }),
    prisma.inventory.groupBy({
      by: ["category"],
      where,
      _count: { id: true },
      _sum: { sellingPrice: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.inventory.groupBy({
      by: ["gemType"],
      where,
      _count: { id: true },
      _sum: { sellingPrice: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.inventory.groupBy({
      by: ["category", "gemType"],
      where,
      _count: { id: true },
      _sum: { sellingPrice: true },
    }),
    prisma.inventory.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.inventory.count({ where: imagesWhere }),
    prisma.inventory.count({ where: certificateWhere }),
    prisma.inventory.count({ where: hsnReadyWhere }),
    prisma.inventory.count({ where: completenessWhere }),
    prisma.inventory.count({ where: overallWhere }),
    prisma.inventory.groupBy({
      by: ["status"],
      where: overallWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  return NextResponse.json({
    totalItems,
    overallTotalItems,
    totalSell: sums._sum.sellingPrice || 0,
    withImagesCount,
    withCertificateCount,
    withHsnCount,
    completenessAllCount,
    byStatus: byStatus.map((r) => ({ status: r.status || "UNKNOWN", items: r._count.id || 0 })),
    overallByStatus: overallByStatus.map((r) => ({ status: r.status || "UNKNOWN", items: r._count.id || 0 })),
    byCategory: byCategory.map((r) => ({
      category: r.category || "Uncategorized",
      items: r._count.id || 0,
      sellValue: r._sum.sellingPrice || 0,
    })),
    byGemType: byGemType.map((r) => ({
      gemType: r.gemType || "Unknown",
      items: r._count.id || 0,
      sellValue: r._sum.sellingPrice || 0,
    })),
    byCategoryGemType: byCategoryGemType.map((r) => ({
      category: r.category || "Uncategorized",
      gemType: r.gemType || "Unknown",
      items: r._count.id || 0,
      sellValue: r._sum.sellingPrice || 0,
    })),
  });
}
