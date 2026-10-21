import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { generateEtsyDescription, type EtsyDescriptionFacts } from "@/lib/etsy-description";

type TaskStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
type TaskError = { id: string; sku: string; error: string };
type EtsyRegenerationTask = {
  id: string;
  status: TaskStatus;
  total: number;
  updated: number;
  failed: number;
  pending: number;
  errors: TaskError[];
  startTime: number;
  endTime?: number;
  message?: string;
  selectedItemIds?: string[];
  selectionMode: "all" | "selected";
};

type TaskRow = {
  id: string;
  status: TaskStatus;
  total: string | number;
  updated: string | number;
  failed: string | number;
  pending: string | number;
  errors: string | null;
  startTime: string | number;
  endTime: string | number | null;
  message: string | null;
  selectedItemIds: string | null;
  selectionMode: "all" | "selected" | null;
};

const taskCache = new Map<string, EtsyRegenerationTask>();
const activeProcessors = new Map<string, Promise<void>>();
const ETSY_BATCH_SIZE = 4;
let taskSchemaReady = false;

async function ensureTaskSchema(): Promise<void> {
  if (taskSchemaReady) return;
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
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("regeneration_tasks")`);
  const existing = new Set(columns.map((column) => column.name));
  for (const column of ["selectedItemIds", "selectionMode"]) {
    if (!existing.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "regeneration_tasks" ADD COLUMN "${column}" TEXT`);
    }
  }
  taskSchemaReady = true;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function saveTask(task: EtsyRegenerationTask): Promise<void> {
  taskCache.set(task.id, task);
  await ensureTaskSchema();
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
    JSON.stringify(task.errors),
    task.startTime,
    task.endTime ?? null,
    task.message ?? null,
    task.selectedItemIds ? JSON.stringify(task.selectedItemIds) : null,
    task.selectionMode
  );
}

async function getTask(taskId: string): Promise<EtsyRegenerationTask | null> {
  const cached = taskCache.get(taskId);
  if (cached) return cached;
  await ensureTaskSchema();
  const rows = await prisma.$queryRawUnsafe<TaskRow[]>(
    `SELECT id, status, CAST(total AS TEXT) AS total, CAST(updated AS TEXT) AS updated,
      CAST(failed AS TEXT) AS failed, CAST(pending AS TEXT) AS pending, errors,
      CAST(startTime AS TEXT) AS startTime, CAST(endTime AS TEXT) AS endTime,
      message, selectedItemIds, selectionMode
     FROM regeneration_tasks WHERE id = ?`,
    taskId
  );
  const row = rows[0];
  if (!row) return null;
  const numberValue = (value: string | number | null, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const task: EtsyRegenerationTask = {
    id: row.id,
    status: row.status,
    total: numberValue(row.total),
    updated: numberValue(row.updated),
    failed: numberValue(row.failed),
    pending: numberValue(row.pending),
    errors: parseJson<TaskError[]>(row.errors, []),
    startTime: numberValue(row.startTime),
    endTime: row.endTime === null ? undefined : numberValue(row.endTime),
    message: row.message ?? undefined,
    selectedItemIds: parseJson<string[] | undefined>(row.selectedItemIds, undefined),
    selectionMode: row.selectionMode || "all",
  };
  taskCache.set(taskId, task);
  return task;
}

async function finishTask(task: EtsyRegenerationTask): Promise<void> {
  task.pending = Math.max(0, task.total - task.updated - task.failed);
  if (task.updated + task.failed < task.total) {
    task.status = "PENDING";
    await saveTask(task);
    return;
  }
  task.status = task.failed ? "FAILED" : "COMPLETED";
  task.pending = 0;
  task.endTime = Date.now();
  task.message = task.failed
    ? `Regeneration finished with ${task.failed} failed item${task.failed === 1 ? "" : "s"}.`
    : "All Etsy descriptions were regenerated successfully.";
  await saveTask(task);
  revalidatePath("/inventory");
  revalidateTag("inventory:stats", "default");
}

const inventorySelect = {
  id: true,
  sku: true,
  itemName: true,
  category: true,
  gemType: true,
  color: true,
  shape: true,
  dimensionsMm: true,
  weightValue: true,
  weightUnit: true,
  carats: true,
  treatment: true,
  origin: true,
  originCountry: true,
  fluorescence: true,
  transparency: true,
  clarity: true,
  clarityGrade: true,
  cut: true,
  cutGrade: true,
  polish: true,
  braceletType: true,
  beadSizeMm: true,
  beadCount: true,
  holeSizeMm: true,
  innerCircumferenceMm: true,
  standardSize: true,
  certificateNo: true,
  certificateNumber: true,
  certification: true,
  lab: true,
  certificateLab: true,
  certificateComments: true,
} satisfies Prisma.InventorySelect;

type SelectedInventory = Prisma.InventoryGetPayload<{ select: typeof inventorySelect }>;

function descriptionFacts(item: SelectedInventory): EtsyDescriptionFacts {
  const recordedCertification = [
    item.certificateNo,
    item.certificateNumber,
    item.certification && item.certification.toLowerCase() !== "none" ? item.certification : null,
    item.lab,
    item.certificateLab,
    item.certificateComments,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
  return {
    itemName: item.itemName,
    category: item.category,
    gemType: item.gemType,
    color: item.color,
    shape: item.shape,
    dimensionsMm: item.dimensionsMm,
    weightValue: item.weightValue,
    weightUnit: item.weightUnit,
    carats: item.carats,
    treatment: item.treatment,
    origin: item.origin,
    originCountry: item.originCountry,
    fluorescence: item.fluorescence,
    transparency: item.transparency,
    clarity: item.clarity,
    clarityGrade: item.clarityGrade,
    cut: item.cut,
    cutGrade: item.cutGrade,
    polish: item.polish,
    braceletType: item.braceletType,
    beadSizeMm: item.beadSizeMm,
    beadCount: item.beadCount,
    holeSizeMm: item.holeSizeMm,
    innerCircumferenceMm: item.innerCircumferenceMm,
    standardSize: item.standardSize,
    hasCertification: recordedCertification,
  };
}

async function processNextBatchWork(task: EtsyRegenerationTask): Promise<void> {
  if (task.status === "CANCELLED" || task.status === "COMPLETED" || task.status === "FAILED") return;
  const processed = task.updated + task.failed;
  if (processed >= task.total) {
    await finishTask(task);
    return;
  }
  task.status = "RUNNING";
  await saveTask(task);
  const batchIds = task.selectedItemIds?.slice(processed, processed + ETSY_BATCH_SIZE);
  const items = task.selectionMode === "selected"
    ? batchIds?.length
      ? await prisma.inventory.findMany({ where: { id: { in: batchIds } }, select: inventorySelect })
      : []
    : await prisma.inventory.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: processed,
        take: ETSY_BATCH_SIZE,
        select: inventorySelect,
      });

  const foundIds = new Set(items.map((item) => item.id));
  const missingIds = batchIds?.filter((id) => !foundIds.has(id)) || [];
  for (const id of missingIds) {
    task.failed += 1;
    task.errors.push({ id, sku: id, error: "Inventory item was removed before its description could be generated." });
  }
  if (task.selectionMode === "all" && !items.length) {
    task.failed += task.pending;
    task.errors.push({ id: "inventory", sku: "unknown", error: "No remaining inventory items could be found while processing the batch." });
    await finishTask(task);
    return;
  }
  if (!items.length) {
    await finishTask(task);
    return;
  }

  const generated = await Promise.all(items.map(async (item) => {
    try {
      const result = await generateEtsyDescription(descriptionFacts(item));
      return { item, description: result.description } as const;
    } catch (error) {
      return { item, error: error instanceof Error ? error.message : "Unable to generate Etsy description." } as const;
    }
  }));

  for (const result of generated) {
    const latestTask = await getTask(task.id);
    if (latestTask?.status === "CANCELLED") return;
    if ("description" in result) {
      try {
        await prisma.inventory.update({ where: { id: result.item.id }, data: { etsyDescription: result.description } });
        task.updated += 1;
      } catch {
        task.failed += 1;
        task.errors.push({ id: result.item.id, sku: result.item.sku, error: "Description was generated but could not be saved. Please retry this item." });
      }
    } else {
      task.failed += 1;
      task.errors.push({ id: result.item.id, sku: result.item.sku, error: result.error });
    }
    task.pending = Math.max(0, task.total - task.updated - task.failed);
    await saveTask(task);
  }
  await finishTask(task);
}

async function processNextBatch(task: EtsyRegenerationTask) {
  const active = activeProcessors.get(task.id);
  if (active) return active;
  const work = processNextBatchWork(task);
  activeProcessors.set(task.id, work);
  try { await work; } finally { activeProcessors.delete(task.id); }
}

function taskResponse(task: EtsyRegenerationTask) {
  const finished = ["COMPLETED", "FAILED", "CANCELLED"].includes(task.status);
  return NextResponse.json({
    success: true,
    status: task.status,
    total: task.total,
    updated: task.updated,
    failed: task.failed,
    pending: task.pending,
    errors: task.errors,
    timeTaken: finished && task.endTime ? Math.round((task.endTime - task.startTime) / 1000) : undefined,
    message: task.message,
  });
}

async function authorized() {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null };
  }
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.INVENTORY_EDIT))) {
    return { response: NextResponse.json({ error: "You do not have permission to regenerate Etsy descriptions." }, { status: 403 }), userId: null };
  }
  return { response: null, userId: session.user.id };
}

export async function POST(request: NextRequest) {
  const authorization = await authorized();
  if (authorization.response) return authorization.response;
  try {
    await ensureTaskSchema();
    const rawItemIds = request.nextUrl.searchParams.get("itemIds");
    let selectedItemIds: string[] | undefined;
    if (rawItemIds) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawItemIds);
      } catch {
        return NextResponse.json({ error: "Selected inventory IDs must be a valid JSON array." }, { status: 400 });
      }
      const validation = z.array(z.string().uuid()).min(1).max(1000).safeParse(parsed);
      if (!validation.success) {
        return NextResponse.json({ error: "Select between 1 and 1,000 valid inventory items." }, { status: 400 });
      }
      const requestedIds = [...new Set(validation.data)];
      const existing = await prisma.inventory.findMany({
        where: { id: { in: requestedIds } },
        select: { id: true },
      });
      selectedItemIds = existing.map((item) => item.id);
    }
    const total = selectedItemIds
      ? selectedItemIds.length
      : await prisma.inventory.count();
    const task: EtsyRegenerationTask = {
      id: crypto.randomUUID(),
      status: total ? "PENDING" : "COMPLETED",
      total,
      updated: 0,
      failed: 0,
      pending: total,
      errors: [],
      startTime: Date.now(),
      endTime: total ? undefined : Date.now(),
      message: total ? undefined : "No inventory items were found.",
      selectedItemIds,
      selectionMode: selectedItemIds ? "selected" : "all",
    };
    await saveTask(task);
    return NextResponse.json({ success: true, taskId: task.id }, { status: 202 });
  } catch (error) {
    console.error("[Regenerate Etsy] Could not start regeneration task:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to start Etsy description regeneration.",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authorization = await authorized();
  if (authorization.response) return authorization.response;
  const taskId = request.nextUrl.searchParams.get("taskId") || "";
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "A valid taskId is required." }, { status: 400 });
  }
  try {
    const task = await getTask(taskId);
    if (!task) return NextResponse.json({ error: "Regeneration task was not found." }, { status: 404 });
    return taskResponse(task);
  } catch (error) {
    console.error("[Regenerate Etsy] Task processing failed:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to process Etsy description regeneration.",
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorized();
  if (authorization.response) return authorization.response;
  const taskId = request.nextUrl.searchParams.get("taskId") || "";
  if (!z.string().uuid().safeParse(taskId).success) return NextResponse.json({ error: "A valid taskId is required." }, { status: 400 });
  try {
    const task = await getTask(taskId);
    if (!task) return NextResponse.json({ error: "Regeneration task was not found." }, { status: 404 });
    if (task.status === "PENDING" || task.status === "RUNNING") await processNextBatch(task);
    const current = await getTask(taskId);
    return current ? taskResponse(current) : NextResponse.json({ error: "Regeneration task was not found." }, { status: 404 });
  } catch (error) {
    console.error("[Regenerate Etsy] Batch processing failed:", error);
    return NextResponse.json({ error: "Unable to process this Etsy description batch. Retry to continue from the last saved item." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorized();
  if (authorization.response) return authorization.response;
  const taskId = request.nextUrl.searchParams.get("taskId") || "";
  if (!z.string().uuid().safeParse(taskId).success) {
    return NextResponse.json({ error: "A valid taskId is required." }, { status: 400 });
  }
  try {
    const task = await getTask(taskId);
    if (!task) return NextResponse.json({ error: "Regeneration task was not found." }, { status: 404 });
    if (task.status === "PENDING" || task.status === "RUNNING") {
      task.status = "CANCELLED";
      task.endTime = Date.now();
      task.message = `Regeneration cancelled. ${task.updated} updated, ${task.failed} failed, ${task.pending} skipped.`;
      await saveTask(task);
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
  } catch (error) {
    console.error("[Regenerate Etsy] Could not cancel regeneration task:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to cancel Etsy description regeneration.",
    }, { status: 500 });
  }
}
