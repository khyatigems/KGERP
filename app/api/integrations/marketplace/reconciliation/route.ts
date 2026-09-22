import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { reconcileInventory } from "@/lib/marketplace/reconciliation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.LISTINGS_VIEW);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const exceptions = await reconcileInventory();
  return NextResponse.json({ exceptions, total: exceptions.length });
}
