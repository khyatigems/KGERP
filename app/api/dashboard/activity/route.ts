import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ActivityLog } from "@prisma/client";

export const revalidate = 60;

export async function GET() {
  try {
      const logs = await prisma.activityLog.findMany({
          take: 20,
          orderBy: { createdAt: "desc" }
      });
      
      // Map Prisma fields to Frontend interface
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
      if (msg.includes("no such table") || msg.includes("SQLITE_UNKNOWN")) {
        return NextResponse.json([]);
      }
      console.error("Activity fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
