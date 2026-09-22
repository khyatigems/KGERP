import { NextRequest, NextResponse } from "next/server";
import { ensureActivityLogSchema, hasTable, prisma } from "@/lib/prisma";
import type { ActivityLog } from "@prisma/client";

export const revalidate = 60;

let activitySchemaReady = false;
let activitySchemaCheckedAt = 0;
const SCHEMA_CHECK_TTL = 5 * 60 * 1000;

async function ensureActivitySchemaCached() {
  const now = Date.now();
  if (activitySchemaReady && (now - activitySchemaCheckedAt) < SCHEMA_CHECK_TTL) return true;
  try {
    await ensureActivityLogSchema();
    activitySchemaReady = true;
    activitySchemaCheckedAt = now;
    return true;
  } catch {
    return false;
  }
}

let activityTableExists: boolean | null = null;
let activityTableCheckedAt = 0;

async function hasActivityTableCached() {
  const now = Date.now();
  if (activityTableExists !== null && (now - activityTableCheckedAt) < SCHEMA_CHECK_TTL) return activityTableExists;
  activityTableExists = await hasTable("ActivityLog");
  activityTableCheckedAt = now;
  return activityTableExists;
}

export async function GET(request: NextRequest) {
  try {
      await ensureActivitySchemaCached();
      const ok = await hasActivityTableCached();
      if (!ok) return NextResponse.json(request.nextUrl.searchParams.get("stats") === "true" ? { total: 0, byAction: {}, byEntity: {} } : []);

      const isStats = request.nextUrl.searchParams.get("stats") === "true";

      if (isStats) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const rows = await prisma.activityLog.findMany({
            where: {
              createdAt: { gte: thirtyDaysAgo },
              actionType: { notIn: ["PUBLIC_VIEW", "QR_SCAN"] }
            },
            select: { actionType: true, entityType: true },
        }).catch(() => []);

        const byAction: Record<string, number> = {};
        const byEntity: Record<string, number> = {};
        for (const row of rows) {
            const action = (row.actionType || "UNKNOWN").replace(/_/g, " ");
            const entity = row.entityType || "Unknown";
            byAction[action] = (byAction[action] || 0) + 1;
            byEntity[entity] = (byEntity[entity] || 0) + 1;
        }

        return NextResponse.json({ total: rows.length, byAction, byEntity });
      }

      const logs = await prisma.activityLog.findMany({
          take: 50,
          where: {
            actionType: { notIn: ["PUBLIC_VIEW", "QR_SCAN"] }
          },
          orderBy: { createdAt: "desc" }
      });
      
      const mappedLogs = logs.map((log: ActivityLog) => ({
          id: log.id,
          entityType: log.entityType,
          actionType: log.actionType,
          entityIdentifier: log.entityIdentifier || log.details || "Unknown",
          timestamp: log.createdAt,
          userName: log.userName || log.userId || "System"
      }));

      return NextResponse.json(mappedLogs);
  } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("no such table") || msg.includes("no such column") || msg.includes("SQLITE_UNKNOWN") || msg.includes("SQL_INPUT_ERROR")) {
        activityTableExists = false;
        activityTableCheckedAt = Date.now();
        return NextResponse.json(request.nextUrl.searchParams.get("stats") === "true" ? { total: 0, byAction: {}, byEntity: {} } : []);
      }
      console.error("Activity fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
