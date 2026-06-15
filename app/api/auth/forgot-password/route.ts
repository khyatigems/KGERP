import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { logActivity } from "@/lib/activity-logger";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    // But log the activity only if the user exists
    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      try {
        await prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "token" TEXT NOT NULL UNIQUE,
            "expiresAt" DATETIME NOT NULL,
            "used" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )`
        );
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PasswordResetToken" (id, "userId", token, "expiresAt") VALUES (?, ?, ?, ?)`,
          crypto.randomUUID(), user.id, token, expires
        );
      } catch (e) {
        console.error("Failed to create reset token:", e);
      }

      try {
        await logActivity({
          entityType: "Security",
          entityId: user.id,
          entityIdentifier: user.email,
          actionType: "PASSWORD_RESET_REQUEST",
          userId: user.id,
          userName: user.name,
          source: "WEB",
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
