import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { prisma } = await import("@/lib/prisma");
    const { logActivity } = await import("@/lib/activity-logger");

    const userId = session.user.id;
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { lastLogin: true, name: true, email: true } });
    const now = new Date();
    const cutoff = new Date(now.getTime() - 10 * 60 * 1000);

    const updateResult = await prisma.user.updateMany({
      where: { id: userId, OR: [{ lastLogin: null }, { lastLogin: { lt: cutoff } }] },
      data: { lastLogin: now },
    });

    if (updateResult.count && updateResult.count > 0) {
      await logActivity({
        entityType: "Security",
        entityId: userId,
        entityIdentifier: dbUser?.email || dbUser?.name || session.user.email || session.user.name || userId,
        actionType: "LOGIN",
        userId,
        userName: dbUser?.name || session.user.name || undefined,
        description: "User auto-logged in (refresh endpoint)",
        metadata: { email: dbUser?.email || session.user.email, name: dbUser?.name || session.user.name },
        source: "WEB",
      });
      return NextResponse.json({ ok: true, lastLogin: now.toISOString() });
    }

    return NextResponse.json({ ok: true, lastLogin: dbUser?.lastLogin || null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("/api/auth/refresh failed:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
