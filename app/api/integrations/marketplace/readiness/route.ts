import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { assessListingReadiness } from "@/lib/marketplace/readiness";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.LISTINGS_VIEW);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const inventoryId = request.nextUrl.searchParams.get("inventoryId");
  if (!inventoryId) {
    return NextResponse.json({ error: "inventoryId is required" }, { status: 400 });
  }

  const result = await assessListingReadiness(inventoryId);
  return NextResponse.json(result);
}
