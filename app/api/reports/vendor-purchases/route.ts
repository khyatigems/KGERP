import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getVendorPurchasesData } from "@/lib/report-module-data";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VENDOR))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await getVendorPurchasesData();
  return NextResponse.json({ rows });
}
