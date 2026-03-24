import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getSalesCycleData } from "@/lib/report-module-data";
import { endOfDay, parseISO, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from ? startOfDay(parseISO(from)) : undefined;
  const toDate = to ? endOfDay(parseISO(to)) : undefined;
  const data = await getSalesCycleData({ from: fromDate, to: toDate });
  return NextResponse.json(data);
}
