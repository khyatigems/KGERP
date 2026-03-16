import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getInventoryAgingAnalytics } from "@/lib/reports-analytics";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const data = await getInventoryAgingAnalytics({
    bucket: params.get("bucket") || undefined,
    category: params.get("category") || undefined,
    vendor: params.get("vendor") || undefined,
    status: params.get("status") || undefined,
    page: params.get("page") ? Number(params.get("page")) : 1,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : 50
  });

  return NextResponse.json({ data });
}
