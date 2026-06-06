import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";
import { buildEbayHtmlDescription } from "@/lib/ebay-description";
import { getEbaySettings } from "@/lib/ebay-settings-server";
import { revalidatePath, revalidateTag } from "next/cache";

interface RegenerationTask {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  total: number;
  updated: number;
  failed: number;
  pending: number;
  errors: Array<{ id: string; sku: string; error: string }>;
  startTime: number;
  endTime?: number;
  message?: string;
  selectedItemIds?: string[]; // For selected items regeneration
  selectionMode?: "all" | "selected"; // Indicates if regenerating all or selected items
}

type RegenerationTaskRow = {
  id: string;
  status: RegenerationTask["status"];
  total: number;
  updated: number;
  failed: number;
  pending: number;
  errors: string | null;
  startTime: number;
  endTime: number | null;
  message: string | null;
  selectedItemIds?: string | null;
  selectionMode?: string | null;
};

type EbaySettingsLike = {
  categoryImageUrls?: string | Record<string, string[]> | null;
  categoryGemtypeImageUrls?: string | Record<string, string[]> | null;
  globalBannerImages?: string | string[] | null;
};

// In-memory store as fallback (regeneration is fast, completes within request timeout)
const regenerationTasks = new Map<string, RegenerationTask>();
const REGENERATION_BATCH_SIZE = 5;
let regenerationTasksSchemaEnsured = false;
let regenerationTasksSchemaPromise: Promise<void> | null = null;
let inventoryDescriptionSchemaEnsured = false;
let inventoryDescriptionSchemaPromise: Promise<void> | null = null;

async function ensureRegenerationTasksSchema() {
  if (regenerationTasksSchemaEnsured) return;
  if (regenerationTasksSchemaPromise) return regenerationTasksSchemaPromise;

  regenerationTasksSchemaPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS regeneration_tasks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'PENDING',
        total INTEGER NOT NULL DEFAULT 0,
        updated INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        pending INTEGER NOT NULL DEFAULT 0,
        errors TEXT NOT NULL DEFAULT '[]',
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        message TEXT,
        selectedItemIds TEXT,
        selectionMode TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    regenerationTasksSchemaEnsured = true;
  })().finally(() => {
    regenerationTasksSchemaPromise = null;
  });

  return regenerationTasksSchemaPromise;
}

async function ensureInventoryDescriptionSchema() {
  if (inventoryDescriptionSchemaEnsured) return;
  if (inventoryDescriptionSchemaPromise) return inventoryDescriptionSchemaPromise;

  inventoryDescriptionSchemaPromise = (async () => {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("Inventory")`
    );
    const columnNames = new Set((columns || []).map((column) => column.name));

    if (!columnNames.has("description")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Inventory" ADD COLUMN "description" TEXT;`);
    }

    if (!columnNames.has("productDescription")) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Inventory" ADD COLUMN "productDescription" TEXT;`);
    }

    inventoryDescriptionSchemaEnsured = true;
  })().finally(() => {
    inventoryDescriptionSchemaPromise = null;
  });

  return inventoryDescriptionSchemaPromise;
}

// Helper to interact with regeneration tasks
async function saveTask(task: RegenerationTask) {
  try {
    await ensureRegenerationTasksSchema();
    console.log(`[Regenerate] Saving task to memory: ${task.id}`);
    // Save to both in-memory and database for redundancy
    regenerationTasks.set(task.id, task);
    console.log(`[Regenerate] Task in memory size: ${regenerationTasks.size}`);
    
    const errorsJson = JSON.stringify(task.errors);
    const selectedItemIdsJson = task.selectedItemIds ? JSON.stringify(task.selectedItemIds) : null;
    console.log(`[Regenerate] Saving task to database: ${task.id}`);
    
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO regeneration_tasks 
       (id, status, total, updated, failed, pending, errors, startTime, endTime, message, selectedItemIds, selectionMode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.status,
      task.total,
      task.updated,
      task.failed,
      task.pending,
      errorsJson,
      task.startTime,
      task.endTime || null,
      task.message || null,
      selectedItemIdsJson,
      task.selectionMode || null
    );
    console.log(`[Regenerate] Task saved to database: ${task.id}`);
  } catch (error) {
    console.error("[Regenerate] Failed to save task to DB:", error);
    console.log(`[Regenerate] But task exists in memory: ${task.id}`);
    // Fallback: keep in memory even if DB save fails
    regenerationTasks.set(task.id, task);
  }
}

async function getTask(taskId: string): Promise<RegenerationTask | null> {
  try {
    await ensureRegenerationTasksSchema();
    // Try in-memory first (fastest)
    const cached = regenerationTasks.get(taskId);
    if (cached) {
      console.log(`[Regenerate] Task found in memory: ${taskId}`);
      return cached;
    }
    
    // Try database - use queryRaw to get results
    const dbResult = await prisma.$queryRawUnsafe<RegenerationTaskRow[]>(
      `SELECT * FROM regeneration_tasks WHERE id = ?`,
      taskId
    );
    
    if (!dbResult || dbResult.length === 0) {
      console.log(`[Regenerate] Task not found in DB: ${taskId}`);
      return null;
    }
    
    const row = dbResult[0];
    const selectedItemIds = row.selectedItemIds ? JSON.parse(row.selectedItemIds) : undefined;
    const task: RegenerationTask = {
      id: row.id,
      status: row.status,
      total: row.total,
      updated: row.updated,
      failed: row.failed,
      pending: row.pending,
      errors: typeof row.errors === "string" ? JSON.parse(row.errors || "[]") : [],
      startTime: row.startTime,
      endTime: row.endTime ?? undefined,
      message: row.message ?? undefined,
      selectedItemIds,
      selectionMode: (row.selectionMode as "all" | "selected") ?? undefined,
    };
    
    // Cache in memory for next lookup
    regenerationTasks.set(taskId, task);
    console.log(`[Regenerate] Task found in DB and cached: ${taskId}`);
    return task;
  } catch (error) {
    console.error("[Regenerate] Failed to fetch task:", error);
    // Return from memory if DB fails
    const fallback = regenerationTasks.get(taskId) || null;
    if (fallback) {
      console.log(`[Regenerate] Using in-memory fallback for: ${taskId}`);
    }
    return fallback;
  }
}

function normalizeCategoryImageUrls(settings: EbaySettingsLike | null | undefined): Record<string, string[]> {
  if (!settings) return {};
  if (settings.categoryImageUrls && typeof settings.categoryImageUrls === "string") {
    try {
      return JSON.parse(settings.categoryImageUrls) as Record<string, string[]>;
    } catch {
      return {};
    }
  }
  return settings.categoryImageUrls && typeof settings.categoryImageUrls === "object"
    ? settings.categoryImageUrls
    : {};
}

async function markTaskCancelled(taskId: string): Promise<RegenerationTask | null> {
  const task = await getTask(taskId);
  if (!task) return null;

  if (task.status === "COMPLETED" || task.status === "FAILED" || task.status === "CANCELLED") {
    return task;
  }

  task.status = "CANCELLED";
  task.endTime = Date.now();
  task.message = `Regeneration cancelled. ${task.updated} updated, ${task.failed} failed, ${task.pending} skipped.`;
  await saveTask(task);
  return task;
}

function normalizeGlobalBannerImages(settings: EbaySettingsLike | null | undefined): string[] | undefined {
  if (!settings) return undefined;
  if (settings.globalBannerImages && typeof settings.globalBannerImages === "string") {
    try {
      return JSON.parse(settings.globalBannerImages) as string[];
    } catch {
      return undefined;
    }
  }
  return Array.isArray(settings.globalBannerImages) ? settings.globalBannerImages : undefined;
}

function normalizeCategoryGemtypeImageUrls(settings: EbaySettingsLike | null | undefined): Record<string, string[]> {
  if (!settings) return {};
  if (settings.categoryGemtypeImageUrls && typeof settings.categoryGemtypeImageUrls === "string") {
    try {
      return JSON.parse(settings.categoryGemtypeImageUrls) as Record<string, string[]>;
    } catch {
      return {};
    }
  }
  return settings.categoryGemtypeImageUrls && typeof settings.categoryGemtypeImageUrls === "object"
    ? settings.categoryGemtypeImageUrls
    : {};
}

async function processRegenerationBatch(taskId: string) {
  const task = await getTask(taskId);
  if (!task) {
    console.error("[Regenerate] Task not found:", taskId);
    return;
  }

  if (task.status === "COMPLETED" || task.status === "FAILED" || task.status === "CANCELLED") {
    return;
  }

  try {
    task.status = "RUNNING";
    await saveTask(task);
    await ensureInventoryDescriptionSchema();

    if (task.total === 0) {
      task.total = await prisma.inventory.count();
      task.pending = task.total;
      task.updated = 0;
      task.failed = 0;
      task.errors = [];
      await saveTask(task);
    }

    const processed = task.updated + task.failed;
    if (processed >= task.total) {
      task.status = task.failed > 0 ? "FAILED" : "COMPLETED";
      task.pending = 0;
      task.endTime = Date.now();
      task.message =
        task.failed > 0
          ? `Regeneration finished with ${task.failed} failed item${task.failed === 1 ? "" : "s"}.`
          : "All descriptions regenerated successfully.";
      await saveTask(task);
      return;
    }

    // Determine which items to fetch based on selection mode
    let itemsQuery: Parameters<typeof prisma.inventory.findMany>[0];
    
    if (task.selectedItemIds && task.selectedItemIds.length > 0) {
      // Regenerate selected items only
      const itemsAlreadyProcessed = task.selectedItemIds.slice(0, processed);
      const remainingItems = task.selectedItemIds.slice(processed, processed + REGENERATION_BATCH_SIZE);
      
      itemsQuery = {
        select: {
          id: true,
          sku: true,
          itemName: true,
          category: true,
          gemType: true,
          color: true,
          shape: true,
          weightValue: true,
          weightUnit: true,
          dimensionsMm: true,
          treatment: true,
          origin: true,
          transparency: true,
          certification: true,
          braceletType: true,
          beadSizeMm: true,
          beadCount: true,
          holeSizeMm: true,
          innerCircumferenceMm: true,
          standardSize: true,
          notes: true,
        },
        where: { id: { in: remainingItems } },
      };
    } else {
      // Regenerate all items (original behavior)
      itemsQuery = {
        select: {
          id: true,
          sku: true,
          itemName: true,
          category: true,
          gemType: true,
          color: true,
          shape: true,
          weightValue: true,
          weightUnit: true,
          dimensionsMm: true,
          treatment: true,
          origin: true,
          transparency: true,
          certification: true,
          braceletType: true,
          beadSizeMm: true,
          beadCount: true,
          holeSizeMm: true,
          innerCircumferenceMm: true,
          standardSize: true,
          notes: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: processed,
        take: REGENERATION_BATCH_SIZE,
      };
    }

    const items = await prisma.inventory.findMany(itemsQuery);

    const settingsResult = await getEbaySettings();
    const settings = settingsResult.success ? settingsResult.data : null;
    const categoryImageUrls = normalizeCategoryImageUrls(settings);
    const categoryGemtypeImageUrls = normalizeCategoryGemtypeImageUrls(settings);
    const globalBannerImages = normalizeGlobalBannerImages(settings);

    for (const item of items) {
      const latestTask = await getTask(taskId);
      if (latestTask?.status === "CANCELLED") {
        task.status = "CANCELLED";
        task.endTime = Date.now();
        task.message = `Regeneration cancelled. ${task.updated} updated, ${task.failed} failed, ${task.pending} skipped.`;
        await saveTask(task);
        return;
      }

      try {
        const html = buildEbayHtmlDescription(
          {
            sku: item.sku,
            itemName: item.itemName,
            category: item.category,
            gemType: item.gemType,
            color: item.color,
            shape: item.shape,
            weightValue: item.weightValue,
            weightUnit: item.weightUnit,
            dimensionsMm: item.dimensionsMm,
            treatment: item.treatment,
            origin: item.origin,
            transparency: item.transparency,
            certification: item.certification,
            braceletType: item.braceletType,
            beadSizeMm: item.beadSizeMm,
            beadCount: item.beadCount,
            holeSizeMm: item.holeSizeMm,
            innerCircumferenceMm: item.innerCircumferenceMm,
            standardSize: item.standardSize,
            notes: item.notes,
          },
          {
            settings: {
              companyName: settings?.companyName ?? undefined,
              tagline: settings?.tagline ?? undefined,
              brandLogoUrl: settings?.brandLogoUrl ?? undefined,
              globalBannerImages,
              categoryImageUrls,
              categoryGemtypeImageUrls,
            },
          }
        );

        await prisma.inventory.update({
          where: { id: item.id },
          data: {
            description: html,
            productDescription: html,
          },
        });

        task.updated += 1;
      } catch (error) {
        task.failed += 1;
        task.errors.push({
          id: item.id,
          sku: item.sku,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        const currentTask = regenerationTasks.get(taskId);
        if (currentTask?.status === "CANCELLED") {
          task.status = "CANCELLED";
        }
        task.pending = Math.max(0, task.total - task.updated - task.failed);
        if (task.status === "CANCELLED") {
          task.endTime = Date.now();
          task.message = `Regeneration cancelled. ${task.updated} updated, ${task.failed} failed, ${task.pending} skipped.`;
        }
        await saveTask(task);
      }
    }

    if (task.status !== "CANCELLED" && task.updated + task.failed >= task.total) {
      task.status = task.failed > 0 ? "FAILED" : "COMPLETED";
      task.pending = 0;
      task.endTime = Date.now();
      task.message =
        task.failed > 0
          ? `Regeneration finished with ${task.failed} failed item${task.failed === 1 ? "" : "s"}.`
          : "All descriptions regenerated successfully.";
      await saveTask(task);

      revalidatePath("/inventory");
      try {
        revalidateTag("inventory:stats", "default");
      } catch {
        // ignore
      }
    }
  } catch (error) {
    task.status = "FAILED";
    task.endTime = Date.now();
    task.message = error instanceof Error ? error.message : "Regeneration failed";
    await saveTask(task);
    console.error("[Regenerate eBay HTML] Background task failed:", error);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  console.log("[Regenerate API] POST invoked");
  console.log("[Regenerate API] session:", !!session, session?.user?.id || null);
  if (!session?.user) {
    console.warn("[Regenerate API] No session.user - unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  console.log("[Regenerate API] permission result:", permission);
  if (!permission.success) {
    console.warn("[Regenerate API] permission denied for user:", session.user.id, permission.message);
    return NextResponse.json({ error: permission.message || "Permission denied" }, { status: 403 });
  }

  // Get itemIds from query parameter if provided
  const itemIdsParam = req.nextUrl.searchParams.get("itemIds");
  let selectedItemIds: string[] | undefined;
  
  if (itemIdsParam) {
    try {
      // Try parsing as JSON array first
      selectedItemIds = JSON.parse(itemIdsParam);
      if (!Array.isArray(selectedItemIds)) {
        selectedItemIds = itemIdsParam.split(",").filter(id => id.trim());
      }
    } catch {
      // If JSON parsing fails, split by comma
      selectedItemIds = itemIdsParam.split(",").filter(id => id.trim());
    }
  }

  const taskId = crypto.randomUUID();
  const task: RegenerationTask = {
    id: taskId,
    status: "PENDING",
    total: selectedItemIds?.length || 0,
    updated: 0,
    failed: 0,
    pending: selectedItemIds?.length || 0,
    errors: [],
    startTime: Date.now(),
    selectedItemIds,
    selectionMode: selectedItemIds ? "selected" : "all",
  };

  console.log(`[Regenerate API] Created task: ${taskId}`, { selectionMode: task.selectionMode, itemCount: selectedItemIds?.length });
  await saveTask(task);
  console.log(`[Regenerate API] Task saved to storage`);

  return NextResponse.json({ success: true, taskId }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  console.log(`[Regenerate API] GET invoked with taskId: ${taskId}`);
  
  if (!taskId) {
    console.warn("[Regenerate API] Missing taskId parameter");
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  let task = await getTask(taskId);
  console.log(`[Regenerate API] Task lookup result: ${task ? 'FOUND' : 'NOT_FOUND'}`);
  
  if (!task) {
    console.warn(`[Regenerate API] Task not found: ${taskId}`);
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.status === "PENDING" || task.status === "RUNNING") {
    await processRegenerationBatch(taskId);
    task = await getTask(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  }

  console.log(`[Regenerate API] Returning task status: ${task.status}`);
  
  return NextResponse.json({
    success: true,
    status: task.status,
    total: task.total,
    updated: task.updated,
    failed: task.failed,
    pending: task.pending,
    errors: task.errors,
    timeTaken:
      task.status === "COMPLETED" ||
      task.status === "FAILED" ||
      task.status === "CANCELLED"
        ? task.endTime && task.startTime
          ? Math.round((task.endTime - task.startTime) / 1000)
          : 0
        : undefined,
    message: task.message,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await checkPermission(PERMISSIONS.INVENTORY_EDIT);
  if (!permission.success) {
    return NextResponse.json({ error: permission.message || "Permission denied" }, { status: 403 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const task = await markTaskCancelled(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    status: task.status,
    total: task.total,
    updated: task.updated,
    failed: task.failed,
    pending: task.pending,
    message: task.message,
  });
}
