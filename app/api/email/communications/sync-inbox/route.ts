import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { pollZohoInbox } from "@/lib/email/inbound";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await pollZohoInbox();
  await logActivity({
    module: "communication",
    action: "inbox.sync",
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    metadata: result,
  });
  return NextResponse.json(result, { status: result.error ? 502 : 200 });
}
