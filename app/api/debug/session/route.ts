import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: true, authenticated: false });
    }

    const userId = session.user.id;
    const hasPermission = await checkUserPermission(userId, PERMISSIONS.INVENTORY_EDIT);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: userId,
        email: session.user.email || null,
      },
      permission: {
        inventoryEdit: hasPermission,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
