import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processQueuedExportJobs } from "@/lib/export-job-processor";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    console.error("Unauthorized cron request for export jobs", {
      hasAuthHeader: Boolean(request.headers.get("authorization")),
      hasCronSecretHeader: Boolean(request.headers.get("x-cron-secret")),
      isProduction: process.env.NODE_ENV === "production"
    });
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  try {
    const result = await processQueuedExportJobs(10);
    return NextResponse.json({
      success: true,
      message: "Processed export jobs",
      ...result
    });
  } catch (error) {
    console.error("Cron export-jobs processor error", error);
    return NextResponse.json({ error: "Failed to process export jobs" }, { status: 500 });
  }
}
