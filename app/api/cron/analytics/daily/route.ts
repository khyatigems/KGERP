import { NextRequest, NextResponse } from "next/server";
import { runDailyAnalyticsSnapshots } from "@/lib/analytics/snapshot-runner";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  try {
    const result = await runDailyAnalyticsSnapshots();
    return NextResponse.json({
      success: true,
      message: "Daily analytics snapshots generated",
      runDate: result.runDate
    });
  } catch (error) {
    console.error("Cron analytics daily error", error);
    return NextResponse.json({ error: "Failed to generate daily analytics snapshots" }, { status: 500 });
  }
}
