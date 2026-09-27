import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processQueuedMarketplaceSyncJobs } from "@/lib/marketplace/sync-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }
  try {
    const result = await processQueuedMarketplaceSyncJobs(5);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Marketplace sync worker failed", error);
    return NextResponse.json({ error: "Marketplace sync worker failed" }, { status: 500 });
  }
}