import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { processQueuedMarketplaceSyncJobs } from "@/lib/marketplace/sync-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await processQueuedMarketplaceSyncJobs(1);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Immediate marketplace sync worker kick failed", error);
    return NextResponse.json({ error: "Marketplace sync worker failed" }, { status: 500 });
  }
}