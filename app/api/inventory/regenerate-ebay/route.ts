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

// Helper to interact with SQLite regeneration_tasks table
async function saveTask(task: RegenerationTask) {
  try {
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO regeneration_tasks 
      (id, status, total, updated, failed, pending, errors, startTime, endTime, message)
      VALUES (${task.id}, ${task.status}, ${task.total}, ${task.updated}, ${task.failed}, 
              ${task.pending}, ${JSON.stringify(task.errors)}, ${task.startTime}, 
              ${task.endTime || null}, ${task.message || null})
    `;
  } catch (error) {
    console.error("[Regenerate] Failed to save task:", error);
  }
}

async function getTask(taskId: string): Promise<RegenerationTask | null> {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT * FROM regeneration_tasks WHERE id = ${taskId}
    `;
    if (!result || result.length === 0) return null;
    
    const row = result[0];
    return {
      id: row.id,
      status: row.status,
      total: row.total,
      updated: row.updated,
      failed: row.failed,
      pending: row.pending,
      errors: JSON.parse(row.errors || '[]'),
      startTime: row.startTime,
      endTime: row.endTime,
      message: row.message,
    };
  } catch (error) {
    console.error("[Regenerate] Failed to fetch task:", error);
    return null;
  }
}

function normalizeCategoryImageUrls(settings: any): Record<string, string[]> {
  if (!settings) return {};
  if (settings.categoryImageUrls && typeof settings.categoryImageUrls === "string") {
    try {
      return JSON.parse(settings.categoryImageUrls);
    } catch {
      return {};
    }
  }
  return settings.categoryImageUrls || {};
}

function normalizeGlobalBannerImages(settings: any): string[] | undefined {
  if (!settings) return undefined;
  if (settings.globalBannerImages && typeof settings.globalBannerImages === "string") {
    try {
      return JSON.parse(settings.globalBannerImages);
    } catch {
      return undefined;
    }
  }
  return settings.globalBannerImages;
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
          data: { productDescription: html },
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

    task.status = "COMPLETED";
    task.endTime = Date.now();
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

  await saveTask(task);
  void runRegenerationTask(taskId);

  return NextResponse.json({ success: true, taskId }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const task = await getTask(taskId);
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
