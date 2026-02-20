"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { computeWeightGrams } from "@/lib/utils";

type PrismaRecord = Record<string, unknown>;
type GpisSettingsDelegate = {
  findFirst: (args?: PrismaRecord) => Promise<PrismaRecord | null>;
  update: (args: { where: PrismaRecord; data: PrismaRecord }) => Promise<PrismaRecord>;
  create: (args: { data: PrismaRecord }) => Promise<PrismaRecord>;
};
type GpisLayoutPresetDelegate = {
  findMany: (args?: PrismaRecord) => Promise<PrismaRecord[]>;
  findFirst: (args?: PrismaRecord) => Promise<PrismaRecord | null>;
  create: (args: { data: PrismaRecord }) => Promise<PrismaRecord>;
  update: (args: { where: PrismaRecord; data: PrismaRecord }) => Promise<PrismaRecord>;
  updateMany: (args: { where?: PrismaRecord; data: PrismaRecord }) => Promise<PrismaRecord>;
  delete: (args: { where: PrismaRecord }) => Promise<PrismaRecord>;
};
type GpisSerialDelegate = {
  findFirst: (args?: PrismaRecord) => Promise<PrismaRecord | null>;
  findMany: (args?: PrismaRecord) => Promise<PrismaRecord[]>;
  findUnique: (args: PrismaRecord) => Promise<PrismaRecord | null>;
  create: (args: { data: PrismaRecord }) => Promise<PrismaRecord>;
  update: (args: { where: PrismaRecord; data: PrismaRecord }) => Promise<PrismaRecord>;
  count: (args?: PrismaRecord) => Promise<number>;
};
type GpisPrintJobDelegate = {
  create: (args: { data: PrismaRecord }) => Promise<PrismaRecord>;
  update: (args: { where: PrismaRecord; data: PrismaRecord }) => Promise<PrismaRecord>;
};
type GpisPrintJobItemDelegate = {
  createMany: (args: { data: PrismaRecord[] }) => Promise<PrismaRecord>;
  findFirst: (args?: PrismaRecord) => Promise<PrismaRecord | null>;
};
type GpisVerificationLogDelegate = {
  create: (args: { data: PrismaRecord }) => Promise<PrismaRecord>;
  findMany: (args?: PrismaRecord) => Promise<PrismaRecord[]>;
  count: (args?: PrismaRecord) => Promise<number>;
};
type PackagingCartItemDelegate = {
  upsert: (args: { where: PrismaRecord; update: PrismaRecord; create: PrismaRecord }) => Promise<PrismaRecord>;
  delete: (args: { where: PrismaRecord }) => Promise<PrismaRecord>;
  deleteMany: (args?: { where?: PrismaRecord }) => Promise<PrismaRecord>;
  findMany: (args?: PrismaRecord) => Promise<PrismaRecord[]>;
  createMany: (args: { data: PrismaRecord[] }) => Promise<PrismaRecord>;
};
type PackagingPrismaClient = typeof prisma & {
  gpisSettings: GpisSettingsDelegate;
  gpisLayoutPreset: GpisLayoutPresetDelegate;
  gpisSerial: GpisSerialDelegate;
  gpisPrintJob: GpisPrintJobDelegate;
  gpisPrintJobItem: GpisPrintJobItemDelegate;
  gpisVerificationLog: GpisVerificationLogDelegate;
  packagingCartItem: PackagingCartItemDelegate;
};

const packagingPrisma = prisma as unknown as PackagingPrismaClient;

type GpisSerialRow = {
  id: string;
  serialNumber: string;
  sku: string;
  status?: string | null;
  inventoryLocation?: string | null;
  packingDate?: Date | null;
  createdAt?: Date | null;
  qcCode?: string | null;
  labelVersion?: string | null;
  unitQuantity?: number | null;
  madeIn?: string | null;
  declaredOriginal?: boolean | null;
};

type SerialLedgerItem = {
  id: string;
  serialNumber: string;
  sku: string;
  status: string;
  inventoryLocation: string | null;
  packedAt: Date | string;
};

type VerificationLogItem = {
  id: string;
  serialNumber: string;
  scannedAt: Date | string;
  ipAddress: string | null;
  userAgent: string | null;
};

type SerialPublicView = {
  id: string;
  serialNumber: string;
  sku: string;
  status: string;
  packedAt: Date | string;
};

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

function normalizeHsn(input: string) {
  return input.replace(/\s+/g, "").toUpperCase();
}

// ---- SETTINGS ACTIONS ----

export async function getPackagingSettings() {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized", data: null as Record<string, unknown> | null };
  const viewPerm = await checkPermission(PERMISSIONS.PACKAGING_VIEW);
  if (!viewPerm.success) {
    const printPerm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
    if (!printPerm.success) return { success: false, message: viewPerm.message, data: null as Record<string, unknown> | null };
  }

  const settings = await packagingPrisma.gpisSettings.findFirst();
  return { success: true, data: settings as Record<string, unknown> | null };
}

export async function updatePackagingSettings(data: Record<string, unknown>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) throw new Error(perm.message);

  // Upsert: Create if not exists, Update if exists (since only 1 row allowed)
  const existing = await packagingPrisma.gpisSettings.findFirst();

  if (existing) {
    await packagingPrisma.gpisSettings.update({
      where: { id: existing.id },
      data: data as PrismaRecord,
    });
  } else {
    await packagingPrisma.gpisSettings.create({
      data: data as PrismaRecord,
    });
  }

  revalidatePath("/erp/packaging/settings");
  revalidatePath("/settings/packaging");
  return { success: true, data };
}

export async function getPackagingCategoryHsnSettings() {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized", categories: [] as string[], map: {} as Record<string, string> };
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) return { success: false, message: perm.message, categories: [] as string[], map: {} as Record<string, string> };

  const categoriesRaw = await prisma.inventory.findMany({
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  const categories = categoriesRaw.map(x => x.category).filter((x): x is string => typeof x === "string" && x.trim().length > 0);

  const settings = await packagingPrisma.gpisSettings.findFirst();
  const categoryHsnJson = (settings as { categoryHsnJson?: string | null } | null)?.categoryHsnJson ?? null;
  const map = parseCategoryHsnJson(categoryHsnJson);

  return { success: true, categories, map };
}

export async function upsertPackagingCategoryHsns(entries: Array<{ category: string; hsnCode: string }>) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };

  const existing = await packagingPrisma.gpisSettings.findFirst();
  const existingMap = parseCategoryHsnJson((existing as { categoryHsnJson?: string | null } | null)?.categoryHsnJson ?? null);

  for (const e of entries) {
    const category = (e.category || "").trim();
    const hsnCode = normalizeHsn(e.hsnCode || "");
    if (!category) continue;
    if (!hsnCode) {
      delete existingMap[category];
      continue;
    }
    existingMap[category] = hsnCode;
  }

  const next = { categoryHsnJson: JSON.stringify(existingMap) };
  if (existing) {
    await packagingPrisma.gpisSettings.update({ where: { id: (existing as { id: string }).id }, data: next });
  } else {
    await packagingPrisma.gpisSettings.create({ data: next });
  }

  revalidatePath("/erp/packaging/settings");
  revalidatePath("/settings/packaging");
  return { success: true };
}

export async function getPackagingLayoutPresets() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);
  const presets = await packagingPrisma.gpisLayoutPreset.findMany({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return { success: true, data: presets };
}

export async function getDefaultPackagingLayoutPreset() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);
  let preset = await packagingPrisma.gpisLayoutPreset.findFirst({
    where: { isDefault: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!preset) {
    preset = await packagingPrisma.gpisLayoutPreset.findFirst({ orderBy: { updatedAt: "desc" } });
  }
  if (!preset) {
    preset = await packagingPrisma.gpisLayoutPreset.create({
      data: {
        name: "A4 2x5 (100x50mm) Optimized",
        unit: "MM",
        pageWidthMm: 210,
        pageHeightMm: 297,
        cols: 2,
        rows: 5,
        labelWidthMm: 100,
        labelHeightMm: 50,
        marginLeftMm: 5,
        marginTopMm: 23.5,
        gapXmm: 0,
        gapYmm: 0,
        offsetXmm: 0,
        offsetYmm: 0,
        startPosition: 1,
        selectedFieldsJson: JSON.stringify(["header", "footer", "qr", "barcode", "price", "origin", "weight"]),
        isDefault: true,
      },
    });
  }
  return { success: true, data: preset };
}

export async function upsertPackagingLayoutPreset(data: {
  id?: string;
  name: string;
  unit: string;
  pageWidthMm: number;
  pageHeightMm: number;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginLeftMm: number;
  marginTopMm: number;
  gapXmm: number;
  gapYmm: number;
  offsetXmm: number;
  offsetYmm: number;
  startPosition: number;
  selectedFieldsJson?: string | null;
  isDefault?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) throw new Error(perm.message);

  const saved = data.id
    ? await packagingPrisma.gpisLayoutPreset.update({
        where: { id: data.id },
        data: {
          name: data.name,
          unit: data.unit,
          pageWidthMm: data.pageWidthMm,
          pageHeightMm: data.pageHeightMm,
          cols: data.cols,
          rows: data.rows,
          labelWidthMm: data.labelWidthMm,
          labelHeightMm: data.labelHeightMm,
          marginLeftMm: data.marginLeftMm,
          marginTopMm: data.marginTopMm,
          gapXmm: data.gapXmm,
          gapYmm: data.gapYmm,
          offsetXmm: data.offsetXmm,
          offsetYmm: data.offsetYmm,
          startPosition: data.startPosition,
          selectedFieldsJson: data.selectedFieldsJson ?? null,
          isDefault: data.isDefault ?? false,
        },
      })
    : await packagingPrisma.gpisLayoutPreset.create({
        data: {
          name: data.name,
          unit: data.unit,
          pageWidthMm: data.pageWidthMm,
          pageHeightMm: data.pageHeightMm,
          cols: data.cols,
          rows: data.rows,
          labelWidthMm: data.labelWidthMm,
          labelHeightMm: data.labelHeightMm,
          marginLeftMm: data.marginLeftMm,
          marginTopMm: data.marginTopMm,
          gapXmm: data.gapXmm,
          gapYmm: data.gapYmm,
          offsetXmm: data.offsetXmm,
          offsetYmm: data.offsetYmm,
          startPosition: data.startPosition,
          selectedFieldsJson: data.selectedFieldsJson ?? null,
          isDefault: data.isDefault ?? false,
        },
      });

  if (saved.isDefault) {
    await packagingPrisma.gpisLayoutPreset.updateMany({
      where: { id: { not: saved.id } },
      data: { isDefault: false },
    });
  }

  revalidatePath("/erp/packaging/settings");
  revalidatePath("/settings/packaging");
  return { success: true, data: saved };
}

export async function deletePackagingLayoutPreset(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_MANAGE);
  if (!perm.success) throw new Error(perm.message);
  await packagingPrisma.gpisLayoutPreset.delete({ where: { id } });
  revalidatePath("/erp/packaging/settings");
  revalidatePath("/settings/packaging");
  return { success: true };
}

// ---- INVENTORY VALIDATION ----

export async function validateInventoryForPackaging(sku: string, _opts?: { bypass?: boolean; providedLocation?: string }) {
  void _opts; // Silence unused variable warning
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized", inventory: null };
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) return { success: false, message: perm.message, inventory: null };

  const inventory = await prisma.inventory.findUnique({
    where: { sku },
    include: {
      categoryCode: true,
      gemstoneCode: true,
    }
  });

  if (!inventory) {
    return { success: false, message: "SKU not found" };
  }

  const missingFields: string[] = [];

  // Required Fields Check (Based on Spec)
  if (!inventory.itemName) missingFields.push("Gemstone Name (Item Name)");
  if (!inventory.sku) missingFields.push("SKU");
  if (!inventory.categoryCodeId && !inventory.category) missingFields.push("Category Code");
  if (!inventory.gemType) missingFields.push("Stone Type");
  if (inventory.weightValue === null || inventory.weightValue === undefined || inventory.weightValue <= 0) missingFields.push("Weight (Carat)");
  const grams = computeWeightGrams(inventory);
  if (grams <= 0) missingFields.push("Weight (Grams)");
  if (!inventory.treatment) missingFields.push("Treatment");
  // Certificate Number is optional as it might not be printed on the label
  // const certNo = inventory.certification;
  // if (!opts?.bypass && !certNo) missingFields.push("Certificate Number");
  if (!inventory.sellingPrice || inventory.sellingPrice <= 0) missingFields.push("MRP");

  const settingsRes = await getPackagingSettings();
  const settings = (settingsRes.success ? settingsRes.data : null) as Record<string, unknown> | null;
  const categoryHsnMap = parseCategoryHsnJson((settings?.categoryHsnJson as unknown) ?? null);
  const mappedHsn = inventory.category ? categoryHsnMap[inventory.category] : undefined;
  if (!mappedHsn) missingFields.push("HSN Code (add in settings)");

  // Check stock location: use provided location if available, otherwise check inventory
  // const effectiveLocation = opts?.providedLocation || inventory.stockLocation;
  // if (!opts?.bypass && !effectiveLocation) missingFields.push("Inventory Location");
  
  const showGstin = (settings?.showGstin as boolean | undefined) ?? true;
  if (showGstin && !(settings?.gstin as string | undefined)) missingFields.push("GSTIN (enabled in settings)");
  
  if (missingFields.length > 0) {
    return { 
      success: false, 
      message: `Missing required fields: ${missingFields.join(", ")}`,
      inventory: null
    };
  }

  // Stock check handled in generation, but good to check here too
  if (inventory.status !== "IN_STOCK") {
      return { success: false, message: `Item status is ${inventory.status}, must be IN_STOCK` };
  }

  return { success: true, inventory };
}

export async function validatePackagingEligibility(inventoryIds: string[]) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized", errors: [], eligibleIds: [] };
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) return { success: false, message: perm.message, errors: [], eligibleIds: [] };
  const items = await prisma.inventory.findMany({
    where: { id: { in: inventoryIds } },
    include: { categoryCode: true, gemstoneCode: true }
  });
  const errors: Array<{ id: string; sku: string; itemName: string; missing: string[] }> = [];
  const eligibleIds: string[] = [];
  const settingsRes = await getPackagingSettings();
  const settings = (settingsRes.success ? settingsRes.data : null) as Record<string, unknown> | null;
  const showGstin = (settings?.showGstin as boolean | undefined) ?? true;
  const gstin = (settings?.gstin as string | undefined) || "";
  const categoryHsnMap = parseCategoryHsnJson((settings?.categoryHsnJson as unknown) ?? null);

  for (const inv of items) {
    const missing: string[] = [];
    if (!inv.itemName) missing.push("Gemstone Name (Item Name)");
    if (!inv.sku) missing.push("SKU");
    if (!inv.categoryCodeId && !inv.category) missing.push("Category Code");
    if (!inv.gemType) missing.push("Stone Type");
    if (inv.weightValue === null || inv.weightValue === undefined || inv.weightValue <= 0) missing.push("Weight (Carat)");
    if (computeWeightGrams(inv) <= 0) missing.push("Weight (Grams)");
    if (!inv.treatment) missing.push("Treatment");
    // Certificate Number is optional
    // if (!inv.certification) missing.push("Certificate Number");
    if (!inv.sellingPrice || inv.sellingPrice <= 0) missing.push("MRP");
    const mappedHsn = inv.category ? categoryHsnMap[inv.category] : undefined;
    if (!mappedHsn) missing.push("HSN Code (add in settings)");
    // if (!inv.stockLocation) missing.push("Inventory Location");
    if (inv.status !== "IN_STOCK") missing.push(`Status ${inv.status} (must be IN_STOCK)`);
    if (showGstin && !gstin) missing.push("GSTIN (enabled in settings)");

    if (missing.length > 0) {
      errors.push({ id: inv.id, sku: inv.sku, itemName: inv.itemName, missing });
    } else {
      eligibleIds.push(inv.id);
    }
  }

  return { success: true, eligibleIds, errors };
}

// ---- INVENTORY LIST FOR WIZARD ----
export async function getPackagingInventory(params?: { search?: string; page?: number; limit?: number }) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = {
      status: "IN_STOCK",
      ...(params?.search
        ? {
            OR: [
              { sku: { contains: params.search } },
              { itemName: { contains: params.search } },
            ],
          }
        : {}),
    };
    const [total, items, debugCount, debugAllCount] = await Promise.all([
      prisma.inventory.count({ where }),
      prisma.inventory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { colorCode: true },
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where: { status: "IN_STOCK" } }),
      prisma.inventory.count(),
    ]);
      
    const dbUrl = process.env.DATABASE_URL ? (process.env.DATABASE_URL.includes("@") ? process.env.DATABASE_URL.split("@")[1] : "local/other") : "undefined";

    return { 
      success: true, 
      data: items, 
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      debug: {
        inStockCount: debugCount,
        totalCount: debugAllCount,
        dbUrl: dbUrl
      }
    };
  } catch (error) {
    console.error("Error in getPackagingInventory:", error);
    return {
      success: false,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
      debug: {
        inStockCount: -1,
        totalCount: -1,
        dbUrl: "Error caught on server: " + (error instanceof Error ? error.message : String(error))
      }
    };
  }
}

// ---- SERIAL GENERATION ----

/*
async function generateSerialHash(serial: string, sku: string) {
  const { createHash, randomBytes } = await import("crypto");
  const data = `${serial}-${sku}-${Date.now()}`;
  return createHash("sha256").update(data).digest("hex").substring(0, 8).toUpperCase();
}
*/

function genHashFrag() {
  return Math.random().toString(16).slice(2, 6).toUpperCase();
}

export async function generateSerials(sku: string, quantity: number, location: string, opts?: { bypass?: boolean; packingDate?: Date }) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" as string };
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) return { success: false, message: perm.message as string };

  // 1. Re-validate Inventory
  const validation = await validateInventoryForPackaging(sku, { ...opts, providedLocation: location });
  if (!validation.success || !validation.inventory) {
    return { success: false, message: validation.message || "Invalid Inventory" };
  }
  const inv = validation.inventory;

  const settings = (await packagingPrisma.gpisSettings.findFirst()) as Record<string, unknown> | null;
  const labelVersion = (settings?.labelVersion as string | undefined) || undefined;

  // 2. Check Stock
  // 'pieces' might be 1 for loose stones, but for packets it could be more.
  // The logic "Validate stock >= quantity" assumes we are packaging 'quantity' units.
  // If inv.pieces < quantity, fail.
  if (inv.pieces < quantity) {
      return { success: false, message: `Insufficient stock. Available: ${inv.pieces}, Requested: ${quantity}` };
  }

  // 3. Generate Serials in Transaction
  // Format: KG-{Category}-{YYMM}-{Running}-{Hash}
  
  const categoryCode = inv.categoryCode?.code || inv.category.substring(0, 2).toUpperCase();
  const date = opts?.packingDate || new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yearMonth = `${yy}${mm}`;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get last running number for this Category + YearMonth
      // We can find the max running number from GpisSerial table
      const t = tx as unknown as PackagingPrismaClient;
      const lastSerial = await t.gpisSerial.findFirst({
        where: {
          categoryCode: categoryCode,
          yearMonth: yearMonth,
        },
        orderBy: { runningNumber: "desc" },
      });

      let nextRunning = ((lastSerial as { runningNumber?: number })?.runningNumber || 0) + 1;
      const serials: unknown[] = [];

      for (let i = 0; i < quantity; i++) {
        const runningStr = nextRunning.toString().padStart(6, "0");
        const hashFrag = genHashFrag(); // 4 chars
        
        const serialNumber = `KG-${categoryCode}-${yearMonth}-${runningStr}-${hashFrag}`;

        const newSerial = await t.gpisSerial.create({
          data: {
            sku: sku,
            serialNumber: serialNumber,
            categoryCode: categoryCode,
            yearMonth: yearMonth,
            runningNumber: nextRunning,
            hashFragment: hashFrag,
            status: "ACTIVE",
            inventoryLocation: location || inv.stockLocation || null,
            qcCode: "QC-PASS",
            packingDate: date,
            labelVersion: labelVersion ?? null,
            unitQuantity: 1,
            madeIn: "India",
            declaredOriginal: true,
            createdBy: session.user.id,
          }
        });

        serials.push(newSerial);
        nextRunning++;
      }
      return serials;
    });

    return { success: true, data: result };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Serial generation failed";
    console.error("Serial Generation Error:", error);
    return { success: false, message };
  }
}

// ---- PRINT JOB ----

function makePrintJobId(prefix: "PJ" | "RP") {
  const date = new Date();
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yymmdd}-${randomSuffix}`;
}

async function createGpisPrintJobWithItems(params: {
  sku: string;
  serials: Array<{ id: string; serialNumber: string }>;
  printerType: string;
  status: string;
  printedBy: string;
}) {
  const p = packagingPrisma;
  const printJobId = makePrintJobId(params.status === "REPRINT" ? "RP" : "PJ");
  const startSerial = params.serials[0]?.serialNumber || null;
  const endSerial = params.serials[params.serials.length - 1]?.serialNumber || null;

  const job = await p.gpisPrintJob.create({
    data: {
      printJobId,
      sku: params.sku,
      startSerial,
      endSerial,
      totalLabels: params.serials.length,
      printerType: params.printerType,
      printedBy: params.printedBy,
      status: params.status,
    },
  });

  await p.gpisPrintJobItem.createMany({
    data: params.serials.map(s => ({
      printJobId: (job as { id: string }).id,
      serialId: s.id,
      serialNumber: s.serialNumber,
      sku: params.sku,
    })),
  });

  return job as { id: string; printJobId: string };
}

export async function createPrintJob(data: {
  sku: string;
  printerType: string;
  serials: Array<{ id: string; serialNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);

  const job = await createGpisPrintJobWithItems({
    sku: data.sku,
    serials: data.serials,
    printerType: data.printerType,
    status: "COMPLETED",
    printedBy: session.user.id,
  });

  return { success: true, data: job };
}

// ---- LEDGER & LOGS ----

export async function getSerialHistory(
  page: number = 1, 
  limit: number = 20, 
  search?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const skip = (page - 1) * limit;
  const where = search ? {
    OR: [
      { serialNumber: { contains: search } },
      { sku: { contains: search } },
    ]
  } : {};

  const [total, serials] = await Promise.all([
    packagingPrisma.gpisSerial.count({ where }),
    packagingPrisma.gpisSerial.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    })
  ]);
  const data: SerialLedgerItem[] = serials.map((row) => {
    const r = row as GpisSerialRow;
    return {
      id: String(r.id ?? ""),
      serialNumber: String(r.serialNumber ?? ""),
      sku: String(r.sku ?? ""),
      status: String(r.status ?? "ACTIVE"),
      inventoryLocation: (r.inventoryLocation ?? null) as string | null,
      packedAt: (r.packingDate ?? r.createdAt ?? new Date()) as Date | string,
    };
  });

  return { 
    success: true, 
    data, 
    pagination: { total, page, limit, pages: Math.ceil(total / limit) } 
  };
}

export async function getVerificationLogs(
  page: number = 1, 
  limit: number = 20
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    packagingPrisma.gpisVerificationLog.count(),
    packagingPrisma.gpisVerificationLog.findMany({
      orderBy: { scannedAt: "desc" },
      skip,
      take: limit,
    })
  ]);
  const data: VerificationLogItem[] = logs.map((row) => {
    const r = row as PrismaRecord;
    return {
      id: String(r.id ?? ""),
      serialNumber: String(r.serialNumber ?? ""),
      scannedAt: (r.scannedAt ?? r.createdAt ?? new Date()) as Date | string,
      ipAddress: (r.ipAddress ?? null) as string | null,
      userAgent: (r.userAgent ?? null) as string | null,
    };
  });

  return { 
    success: true, 
    data, 
    pagination: { total, page, limit, pages: Math.ceil(total / limit) } 
  };
}

// ---- PUBLIC VERIFICATION ----

export async function verifySerialPublic(serialNumber: string, ip: string, userAgent: string): Promise<{
  success: boolean;
  message?: string;
  data?: { serial: SerialPublicView; inventory: Inventory | null };
}> {
  // 1. Log the scan
  await packagingPrisma.gpisVerificationLog.create({
    data: {
      serialNumber,
      ipAddress: ip,
      userAgent,
    }
  });

  // 2. Find Serial
  const serial = await packagingPrisma.gpisSerial.findUnique({
    where: { serialNumber }
  });

  if (!serial) {
    return { success: false, message: "Invalid Serial" };
  }
  const serialRow = serial as GpisSerialRow;
  const serialPublic: SerialPublicView = {
    id: String(serialRow.id ?? ""),
    serialNumber: String(serialRow.serialNumber ?? ""),
    sku: String(serialRow.sku ?? ""),
    status: String(serialRow.status ?? "ACTIVE"),
    packedAt: (serialRow.packingDate ?? serialRow.createdAt ?? new Date()) as Date | string,
  };

  // 3. Fetch Inventory Details (for display)
  const inventory = await prisma.inventory.findUnique({
    where: { sku: serialPublic.sku },
    include: {
        certificates: true
    }
  });

  return { 
    success: true, 
    data: {
      serial: serialPublic,
      inventory
    }
  };
}

// ---- PUBLIC LABEL DATA ----

export async function getPublicLabelData(serialNumber: string) {
  // 1. Find Serial
  const serial = await packagingPrisma.gpisSerial.findUnique({
    where: { serialNumber }
  });
  
  if (!serial) {
    return { success: false, message: "Serial not found" };
  }
  const serialRow = serial as GpisSerialRow;

  // 2. Find Inventory
  const inv = await prisma.inventory.findUnique({
    where: { sku: serialRow.sku }
  });
  
  if (!inv) return { success: false, message: "Inventory item not found" };

  // 3. Get Settings (No auth check needed for public label display as it is just brand info)
  const settings = await packagingPrisma.gpisSettings.findFirst();

  // 4. Build Data
  // We need to fetch the print job to get the ID if we want to display it, 
  // but for public preview we might just use the serial's latest job or a placeholder.
  // The serial row doesn't store printJobId directly, it's in gpisPrintJobItem.
  // Let's find the latest print job item for this serial.
  
  const jobItem = await packagingPrisma.gpisPrintJobItem.findFirst({
    where: { serialNumber },
    orderBy: { createdAt: "desc" }
  });

  const printJobId = (jobItem as { printJobId: string } | null)?.printJobId || "PJ-PREVIEW";

  const labelData = buildGpisLabelData({ 
    inv, 
    serial: serialRow, 
    settings: settings as Record<string, unknown> | null, 
    printJobId 
  });

  return { success: true, data: labelData };
}

// ---- PACKAGING CART ----
export async function addToPackagingCart(inventoryId: string, quantity: number = 1, location?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const item = await packagingPrisma.packagingCartItem.upsert({
    where: { userId_inventoryId: { userId: session.user.id, inventoryId } },
    update: { quantity, location },
    create: { userId: session.user.id, inventoryId, quantity, location },
  });
  revalidatePath("/erp/packaging");
  return { success: true, data: item };
}

export async function removeFromPackagingCart(inventoryId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await packagingPrisma.packagingCartItem.delete({
    where: { userId_inventoryId: { userId: session.user.id, inventoryId } },
  });
  revalidatePath("/erp/packaging");
  return { success: true };
}

export async function clearPackagingCart() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await packagingPrisma.packagingCartItem.deleteMany({
    where: { userId: session.user.id },
  });
  revalidatePath("/erp/packaging");
  return { success: true };
}

export async function addManyToPackagingCart(inventoryIds: string[], quantity: number = 1) {
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  const existing = await packagingPrisma.packagingCartItem.findMany({
    where: { userId: session.user.id, inventoryId: { in: inventoryIds } },
    select: { inventoryId: true },
  });
  const existingIds = new Set(existing.map((e) => (e as { inventoryId?: string }).inventoryId).filter(Boolean));
  const toAdd = inventoryIds.filter(id => !existingIds.has(id));
  if (toAdd.length > 0) {
    await packagingPrisma.packagingCartItem.createMany({
      data: toAdd.map(id => ({ userId: session.user.id!, inventoryId: id, quantity })),
    });
  }
  revalidatePath("/erp/packaging");
  return { success: true, count: toAdd.length };
}

export async function getPackagingCart() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const items = await packagingPrisma.packagingCartItem.findMany({
    where: { userId: session.user.id },
    include: {
      inventory: {
        include: { colorCode: true },
      },
    },
    orderBy: { addedAt: "desc" },
  });
  return items;
}

import type { Inventory } from "@prisma/client";

function buildGpisLabelData(params: {
  inv: Inventory;
  serial: { id: string; serialNumber: string; inventoryLocation?: string | null; packingDate?: Date | null; labelVersion?: string | null; qcCode?: string | null; unitQuantity?: number | null; madeIn?: string | null; declaredOriginal?: boolean | null };
  settings: Record<string, unknown> | null;
  printJobId: string;
}) {
  const s = params.settings || {};
  const showRegisteredAddress = (s.showRegisteredAddress as boolean | undefined) ?? true;
  const showGstin = (s.showGstin as boolean | undefined) ?? true;
  const showIec = (s.showIec as boolean | undefined) ?? true;
  const showSupport = (s.showSupport as boolean | undefined) ?? true;
  const showWatermark = (s.showWatermark as boolean | undefined) ?? true;

  const inv = params.inv;
  const grams = computeWeightGrams(inv);
  const categoryHsnMap = parseCategoryHsnJson((s.categoryHsnJson as unknown) ?? null);
  const mappedHsn = inv.category ? categoryHsnMap[inv.category] : undefined;

  return {
    serial: params.serial.serialNumber,
    sku: inv.sku,
    gemstoneName: inv.itemName,
    stoneType: inv.gemType || "",
    condition: "New",
    weightCarat: inv.weightValue ?? 0,
    weightRatti: inv.weightRatti ?? undefined,
    weightGrams: grams,
    color: inv.color ?? undefined,
    clarityGrade: inv.clarityGrade || undefined,
    cutGrade: inv.cutGrade || undefined,
    shape: inv.shape || undefined,
    cut: inv.cut || undefined,
    treatment: inv.treatment || "",
    originCountry: inv.origin || undefined,
    cutPolishedIn: "India",
    certificateLab: undefined, // inv.certification is a string, not separated lab
    certificateNumber: inv.certification || undefined,
    mrp: inv.sellingPrice,
    hsn: mappedHsn || "",
    qcCode: params.serial.qcCode || undefined,
    inventoryLocation: params.serial.inventoryLocation || inv.stockLocation || undefined,
    packingDate: params.serial.packingDate || new Date(),
    labelVersion: (params.serial.labelVersion || (s.labelVersion as string | undefined)) ?? undefined,
    printJobId: params.printJobId,
    unitQuantity: params.serial.unitQuantity ?? 1,
    madeIn: params.serial.madeIn || "India",
    declaredOriginal: params.serial.declaredOriginal ?? true,

    brandName: (s.brandName as string | undefined) ?? undefined,
    tagline: (s.tagline as string | undefined) ?? undefined,
    estYear: (s.estYear as string | undefined) ?? undefined,
    logoUrl: (s.logoUrl as string | undefined) ?? undefined,

    registeredAddress: showRegisteredAddress ? ((s.registeredAddress as string | undefined) ?? undefined) : undefined,
    gstin: showGstin ? ((s.gstin as string | undefined) ?? undefined) : undefined,
    iec: showIec ? ((s.iec as string | undefined) ?? undefined) : undefined,

    supportEmail: showSupport ? ((s.supportEmail as string | undefined) ?? undefined) : undefined,
    supportPhone: showSupport ? ((s.supportPhone as string | undefined) ?? undefined) : undefined,
    supportTimings: showSupport ? ((s.supportTimings as string | undefined) ?? undefined) : undefined,
    supportWebsite: showSupport ? ((s.website as string | undefined) ?? undefined) : undefined,

    watermarkText: showWatermark ? ((s.watermarkText as string | undefined) ?? undefined) : undefined,
    watermarkOpacity: showWatermark ? ((s.watermarkOpacity as number | undefined) ?? undefined) : undefined,
    watermarkRotation: showWatermark ? ((s.watermarkRotation as number | undefined) ?? undefined) : undefined,
    watermarkFontSize: showWatermark ? ((s.watermarkFontSize as number | undefined) ?? undefined) : undefined,

    microBorderText: (s.microBorderText as string | undefined) ?? undefined,
    toleranceCarat: (s.toleranceCarat as number | undefined) ?? undefined,
    toleranceGram: (s.toleranceGram as number | undefined) ?? undefined,

    careInstruction: (s.careInstruction as string | undefined) ?? undefined,
    legalMetrology: (s.legalMetrologyLine as string | undefined) ?? undefined,
  };
}

export async function createPackagingPrintFromCart(params?: { bypass?: boolean; packingDate?: Date; labelVariant?: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);
  const cartItems = (await packagingPrisma.packagingCartItem.findMany({
    where: { userId: session.user.id },
    include: { inventory: true },
  })) as Array<{ inventory: Inventory | null; quantity: number; location?: string | null }>;
  if (cartItems.length === 0) return { success: false, message: "Cart is empty" };

  const settingsRes = await getPackagingSettings();
  const settings = settingsRes.data as Record<string, unknown> | null;

  const allLabels: Array<Record<string, unknown>> = [];

  for (const ci of cartItems) {
    const inv = ci.inventory;
    if (!inv) continue;
    const gen = await generateSerials(inv.sku, ci.quantity, ci.location || inv.stockLocation || "", { 
      bypass: params?.bypass, 
      packingDate: params?.packingDate 
    });
    if (!gen.success || !gen.data) return { success: false, message: gen.message || "Serial generation failed" };

    const serials = gen.data as Array<{ id: string; serialNumber: string; inventoryLocation: string | null; packingDate?: Date | null; labelVersion?: string | null; qcCode?: string | null; unitQuantity?: number | null; madeIn?: string | null; declaredOriginal?: boolean | null }>;
    const job = await createGpisPrintJobWithItems({
      sku: inv.sku,
      serials: serials.map(s => ({ id: s.id, serialNumber: s.serialNumber })),
      printerType: "A4",
      status: "COMPLETED",
      printedBy: session.user.id,
    });

    for (const s of serials) {
      // Apply override variant if provided, else use serial/settings default
      const finalSerial = { ...s };
      if (params?.labelVariant) {
         // We don't store variant in serial table currently, but buildGpisLabelData uses it from settings or serial
         // If we want to force it for the print output:
         // We can pass it in options to buildGpisLabelData if we update that function, 
         // OR we can just rely on the client side to render the correct variant.
         // But the `allLabels` returned here are used for... actually they are just returned.
         // The client generates the PDF.
         // So the critical part is that the SERIALS are generated with the correct DATE.
      }
      allLabels.push(buildGpisLabelData({ inv, serial: finalSerial, settings, printJobId: job.printJobId }));
    }
  }

  await packagingPrisma.packagingCartItem.deleteMany({ where: { userId: session.user.id } });
  revalidatePath("/erp/packaging");
  revalidatePath("/erp/packaging");
  return { success: true, labels: allLabels };
}

export async function previewPackagingFromCart(params?: { packingDate?: Date }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // Perm check
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);

  const cartItems = (await packagingPrisma.packagingCartItem.findMany({
    where: { userId: session.user.id },
    include: { 
      inventory: {
        include: { categoryCode: true }
      } 
    },
  })) as Array<{ inventory: (Inventory & { categoryCode?: { code: string } | null }) | null; quantity: number; location?: string | null }>;
  
  if (cartItems.length === 0) return { success: false, message: "Cart is empty" };

  const settingsRes = await getPackagingSettings();
  const settings = settingsRes.data as Record<string, unknown> | null;

  const allLabels: Array<Record<string, unknown>> = [];
  const date = params?.packingDate || new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const yearMonth = `${yy}${mm}`;

  for (const ci of cartItems) {
    const inv = ci.inventory;
    if (!inv) continue;
    
    // Simulate serials for preview
    const categoryCode = inv.categoryCode?.code || inv.category?.substring(0, 2).toUpperCase() || "XX";
    
    for (let i = 0; i < ci.quantity; i++) {
       const dummySerial = `KG-${categoryCode}-${yearMonth}-000000-PREV`;
       
       // Construct dummy serial row
       const serialRow = {
         id: "preview-id",
         serialNumber: dummySerial,
         sku: inv.sku,
         status: "PREVIEW",
         inventoryLocation: ci.location || inv.stockLocation || null,
         packingDate: date,
         labelVersion: null,
         qcCode: "QC-PASS",
         unitQuantity: 1,
         madeIn: "India",
         declaredOriginal: true,
       };

       allLabels.push(buildGpisLabelData({ 
         inv, 
         serial: serialRow, 
         settings, 
         printJobId: "PJ-PREVIEW" 
       }));
    }
  }

  // DO NOT DELETE CART
  return { success: true, labels: allLabels };
}

export async function processPackagingPrint(inventoryIds: string[], bypass?: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);
  
  const items = await prisma.inventory.findMany({
    where: { id: { in: inventoryIds } },
    include: { categoryCode: true, gemstoneCode: true }
  });

  if (items.length === 0) return { success: false, message: "No items found" };

  const settingsRes = await getPackagingSettings();
  const settings = settingsRes.data as Record<string, unknown> | null;

  const allLabels: Array<Record<string, unknown>> = [];

  for (const inv of items) {
    // Generate 1 serial per selected item
    const gen = await generateSerials(inv.sku, 1, inv.stockLocation || "", { bypass });
    if (!gen.success || !gen.data) return { success: false, message: gen.message || "Serial generation failed" };

    const serials = gen.data as Array<{ id: string; serialNumber: string; inventoryLocation: string | null; packingDate?: Date | null; labelVersion?: string | null; qcCode?: string | null; unitQuantity?: number | null; madeIn?: string | null; declaredOriginal?: boolean | null }>;
    const job = await createGpisPrintJobWithItems({
      sku: inv.sku,
      serials: serials.map(s => ({ id: s.id, serialNumber: s.serialNumber })),
      printerType: "A4",
      status: "COMPLETED",
      printedBy: session.user.id,
    });

    for (const s of serials) {
      allLabels.push(buildGpisLabelData({ inv, serial: s, settings, printJobId: job.printJobId }));
    }
  }

  revalidatePath("/erp/packaging");
  revalidatePath("/erp/packaging");
  return { success: true, labels: allLabels };
}

export async function reprintSerial(serialNumber: string, newPackingDate?: Date) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const perm = await checkPermission(PERMISSIONS.PACKAGING_PRINT);
  if (!perm.success) throw new Error(perm.message);

  const p = packagingPrisma;
  
  // 1. Find Serial
  const serial = await p.gpisSerial.findUnique({
    where: { serialNumber }
  });
  
  if (!serial) return { success: false, message: "Serial not found" };
  const serialRow = serial as GpisSerialRow;

  // 2. Find Inventory
  const inv = await prisma.inventory.findUnique({
    where: { sku: serialRow.sku }
  });
  
  if (!inv) return { success: false, message: "Inventory item not found" };

  // 3. Get Settings
  const settingsRes = await getPackagingSettings();
  const settings = settingsRes.data as Record<string, unknown> | null;

  const previousItem = await p.gpisPrintJobItem.findFirst({
    where: { serialNumber },
    orderBy: { createdAt: "desc" },
  });

  const newJob = await createGpisPrintJobWithItems({
    sku: inv.sku,
    serials: [{ id: serialRow.id, serialNumber: serialRow.serialNumber }],
    printerType: "A4",
    status: "REPRINT",
    printedBy: session.user.id,
  });

  if (previousItem) {
    await p.gpisPrintJob.update({
      where: { id: (previousItem as { printJobId: string }).printJobId },
      data: { status: "SUPERSEDED", supersededById: newJob.id, supersededAt: new Date() } as unknown as PrismaRecord,
    });
  }

  // 5. Update Serial Status
  const updateData: Record<string, unknown> = {
    reprintCount: { increment: 1 },
    status: "REPRINTED"
  };
  
  if (newPackingDate) {
    updateData.packingDate = newPackingDate;
    // Update local object for label generation
    serialRow.packingDate = newPackingDate;
  }

  await p.gpisSerial.update({
    where: { id: serialRow.id },
    data: updateData as unknown as PrismaRecord
  });

  const labelData = buildGpisLabelData({ inv, serial: serialRow, settings, printJobId: newJob.printJobId });
  return { success: true, labels: [labelData] };
}
