import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getCommunicationTimeline } from "@/lib/email/email-log";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.CUSTOMER_VIEW);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customerId = request.nextUrl.searchParams.get("customerId") || undefined;
  const orderId = request.nextUrl.searchParams.get("orderId") || undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") || 50);

  if (!customerId && !orderId) {
    return NextResponse.json({ error: "customerId or orderId is required" }, { status: 400 });
  }

  const entries = await getCommunicationTimeline({ customerId, orderId, limit });
  return NextResponse.json({ entries });
}
