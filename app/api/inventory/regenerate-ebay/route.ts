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
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  total: number;
  updated: number;
  failed: number;
  pending: number;
  errors: Array<{ id: string; sku: string; error: string }>;
  startTime: number;
  endTime?: number;
  message?: string;
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
};

type EbaySettingsLike = {
  categoryImageUrls?: string | Record<string, string[]> | null;
  globalBannerImages?: string | string[] | null;
};

// In-memory store as fallback (regeneration is fast, completes within request timeout)
const regenerationTasks = new Map<string, RegenerationTask>();
let inventoryDescriptionSchemaEnsured = false;
let inventoryDescriptionSchemaPromise: Promise<void> | null = null;

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
    console.log(`[Regenerate] Saving task to memory: ${task.id}`);
    // Save to both in-memory and database for redundancy
    regenerationTasks.set(task.id, task);
    console.log(`[Regenerate] Task in memory size: ${regenerationTasks.size}`);
    
    const errorsJson = JSON.stringify(task.errors);
    console.log(`[Regenerate] Saving task to database: ${task.id}`);
    
    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO regeneration_tasks 
       (id, status, total, updated, failed, pending, errors, startTime, endTime, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.status,
      task.total,
      task.updated,
      task.failed,
      task.pending,
      errorsJson,
      task.startTime,
      task.endTime || null,
      task.message || null
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
    const task: RegenerationTask = {
      id: row.id,
      status: row.status,
      total: row.total,
      updated: row.updated,
      failed: row.failed,
      pending: row.pending,
      errors: typeof row.errors === 'string' ? JSON.parse(row.errors || '[]') : [],
      startTime: row.startTime,
      endTime: row.endTime ?? undefined,
      message: row.message ?? undefined,
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

async function runRegenerationTask(taskId: string) {
  const task = await getTask(taskId);
  if (!task) {
    console.error("[Regenerate] Task not found:", taskId);
    return;
  }

  task.status = "RUNNING";
  await saveTask(task);

  try {
    await ensureInventoryDescriptionSchema();

    const items = await prisma.inventory.findMany({
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
    });

    task.total = items.length;
    task.pending = items.length;
    task.updated = 0;
    task.failed = 0;
    task.errors = [];
    await saveTask(task);

    const settingsResult = await getEbaySettings();
    const settings = settingsResult.success ? settingsResult.data : null;
    const categoryImageUrls = normalizeCategoryImageUrls(settings);
    const globalBannerImages = normalizeGlobalBannerImages(settings);

    for (const item of items) {
      try {
        const categoryImages = item.category ? categoryImageUrls[item.category] : undefined;

        const html = buildEbayHtmlDescription(
          {
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
            categoryImages,
            settings: {
              companyName: settings?.companyName ?? undefined,
              tagline: settings?.tagline ?? undefined,
              brandLogoUrl: settings?.brandLogoUrl ?? undefined,
              globalBannerImages,
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
        task.pending = Math.max(0, task.total - task.updated - task.failed);
        await saveTask(task);
      }
    }

    task.status = task.failed > 0 ? "FAILED" : "COMPLETED";
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
  } catch (error) {
    task.status = "FAILED";
    task.endTime = Date.now();
    task.message = error instanceof Error ? error.message : "Regeneration failed";
    await saveTask(task);
    console.error("[Regenerate eBay HTML] Background task failed:", error);
  } finally {
    // Cleanup task after 10 minutes
    setTimeout(async () => {
      try {
        await prisma.$executeRaw`DELETE FROM regeneration_tasks WHERE id = ${taskId}`;
      } catch {
        // ignore
      }
    }, 1000 * 60 * 10);
  }
}

export async function POST() {
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

  const taskId = crypto.randomUUID();
  const task: RegenerationTask = {
    id: taskId,
    status: "PENDING",
    total: 0,
    updated: 0,
    failed: 0,
    pending: 0,
    errors: [],
    startTime: Date.now(),
  };

  console.log(`[Regenerate API] Created task: ${taskId}`);
  await saveTask(task);
  console.log(`[Regenerate API] Task saved to storage`);
  void runRegenerationTask(taskId);
  console.log(`[Regenerate API] Started background regeneration task`);

  return NextResponse.json({ success: true, taskId }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  console.log(`[Regenerate API] GET invoked with taskId: ${taskId}`);
  
  if (!taskId) {
    console.warn("[Regenerate API] Missing taskId parameter");
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const task = await getTask(taskId);
  console.log(`[Regenerate API] Task lookup result: ${task ? 'FOUND' : 'NOT_FOUND'}`);
  
  if (!task) {
    console.warn(`[Regenerate API] Task not found: ${taskId}`);
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
      task.status === "COMPLETED" || task.status === "FAILED"
        ? task.endTime && task.startTime
          ? Math.round((task.endTime - task.startTime) / 1000)
          : 0
        : undefined,
    message: task.message,
  });
}
