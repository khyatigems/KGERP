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

const regenerationTasks = new Map<string, RegenerationTask>();

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
  const task = regenerationTasks.get(taskId);
  if (!task) {
    return;
  }

  task.status = "RUNNING";

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
              companyName: settings?.companyName,
              tagline: settings?.tagline,
              brandLogoUrl: settings?.brandLogoUrl,
              globalBannerImages,
            },
          }
        );

        await prisma.inventory.update({
          where: { id: item.id },
          data: { description: html },
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
      }
    }

    task.status = "COMPLETED";
    task.endTime = Date.now();

    revalidatePath("/inventory");
    try {
      revalidateTag("inventory:stats");
    } catch {
      // ignore
    }
  } catch (error) {
    task.status = "FAILED";
    task.endTime = Date.now();
    task.message = error instanceof Error ? error.message : "Regeneration failed";
    console.error("[Regenerate eBay HTML] Background task failed:", error);
  } finally {
    setTimeout(() => regenerationTasks.delete(taskId), 1000 * 60 * 10);
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
  regenerationTasks.set(taskId, {
    id: taskId,
    status: "PENDING",
    total: 0,
    updated: 0,
    failed: 0,
    pending: 0,
    errors: [],
    startTime: Date.now(),
  });

  void runRegenerationTask(taskId);

  return NextResponse.json({ success: true, taskId }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const task = regenerationTasks.get(taskId);
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
