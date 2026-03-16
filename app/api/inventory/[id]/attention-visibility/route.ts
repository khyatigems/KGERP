import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getInventoryAttentionVisibility, setInventoryAttentionVisibility } from "@/lib/attention-visibility";
import { withFreezeGuard } from "@/lib/governance";

const ParamSchema = z.object({
  id: z.string().min(1)
});

const BodySchema = z.object({
  hideFromAttention: z.boolean()
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role || "VIEWER";
    if (!hasPermission(role, PERMISSIONS.INVENTORY_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await context.params;
    const parsedParams = ParamSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid inventory id" }, { status: 400 });
    }

    const current = await getInventoryAttentionVisibility(parsedParams.data.id);
    if (!current) {
      return NextResponse.json({ error: "Inventory SKU not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: current.id,
      sku: current.sku,
      hideFromAttention: current.hideFromAttention
    });
  } catch (error) {
    console.error("Attention visibility GET error:", error);
    return NextResponse.json({ error: "Failed to load attention visibility" }, { status: 500 });
  }
}

async function patchAttentionVisibility(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role || "VIEWER";
    if (!hasPermission(role, PERMISSIONS.INVENTORY_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await context.params;
    const parsedParams = ParamSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid inventory id" }, { status: 400 });
    }

    const body = await request.json();
    const parsedBody = BodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await setInventoryAttentionVisibility(
      parsedParams.data.id,
      parsedBody.data.hideFromAttention,
      {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown"
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      updated: result.updated,
      id: result.data.id,
      sku: result.data.sku,
      hideFromAttention: result.data.hideFromAttention
    });
  } catch (error) {
    console.error("Attention visibility PATCH error:", error);
    return NextResponse.json({ error: "Failed to update attention visibility" }, { status: 500 });
  }
}

export const PATCH = withFreezeGuard("Inventory attention visibility update", patchAttentionVisibility);
