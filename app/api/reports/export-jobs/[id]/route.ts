import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { withFreezeGuard } from "@/lib/governance";

async function patchExportJob(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SETTINGS_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status?: string;
    downloadUrl?: string;
    errorMessage?: string;
  };
  const status = String(body.status || "").toUpperCase();
  if (!["QUEUED", "PROCESSING", "COMPLETED", "FAILED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const job = await prisma.reportExportJob.update({
    where: { id },
    data: {
      status,
      downloadUrl: body.downloadUrl || null,
      errorMessage: body.errorMessage || null,
    }
  });
  return NextResponse.json({ job });
}

export const PATCH = withFreezeGuard("Export job update", patchExportJob);
