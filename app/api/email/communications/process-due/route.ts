import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { processEmailQueue } from "@/lib/email/queue";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await processEmailQueue(25);
    if (result.processed > 0) {
      await logActivity({
        module: "communication",
        action: "email.queue.process_due",
        userId: session.user.id,
        userName: session.user.name ?? undefined,
        metadata: { ...result },
      });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[email-queue] Manual queue processing failed:", error);
    return NextResponse.json({ error: "Unable to process due emails" }, { status: 500 });
  }
}
