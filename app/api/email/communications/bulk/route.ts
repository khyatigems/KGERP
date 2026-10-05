import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queueSelectedEmailRetries, retryAllEligibleEmails } from "@/lib/email/queue";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null) as { ids?: unknown; allEligible?: unknown } | null;
  if (!body) return NextResponse.json({ error: "A valid bulk action is required" }, { status: 400 });
  if (body.allEligible === true) {
    const result = await retryAllEligibleEmails();
    return NextResponse.json({ success: true, ...result });
  }
  if (
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    body.ids.length > 25 ||
    body.ids.some((id) => typeof id !== "string" || id.length > 128)
  ) {
    return NextResponse.json({ error: "Select between 1 and 25 eligible communications" }, { status: 400 });
  }

  const result = await queueSelectedEmailRetries(body.ids as string[]);
  return NextResponse.json({ success: result.queued > 0, ...result }, { status: result.queued > 0 ? 200 : 409 });
}
