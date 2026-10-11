import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getCustomerIntelligence } from "@/lib/customer-intelligence";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VIEW))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role) && !(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_CUSTOMER_INSIGHTS))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const data = await getCustomerIntelligence(365);
  return NextResponse.json(data);
}
