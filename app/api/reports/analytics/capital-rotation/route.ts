import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCapitalRotationAnalytics } from "@/lib/reports-analytics";

export const revalidate = 300;

export async function GET(_request: NextRequest) {
  void _request;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getCapitalRotationAnalytics();
  return NextResponse.json({ data });
}
