import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserThemeSchema, ensurePremiumModeSchema, prisma } from "@/lib/prisma";
import { isThemePalette } from "@/lib/theme-palettes";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUserThemeSchema();
  await ensurePremiumModeSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ themePreference: string | null; premiumMode: number | null }>>(
    `SELECT "themePreference", "premiumMode" FROM "User" WHERE "id" = ? LIMIT 1`,
    session.user.id,
  );
  const palette = isThemePalette(rows[0]?.themePreference) ? rows[0].themePreference : "default";
  const premium = rows[0]?.premiumMode === 1;
  return NextResponse.json({ palette, premium });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.palette !== undefined && !isThemePalette(body.palette)) {
    return NextResponse.json({ error: "Invalid theme palette" }, { status: 400 });
  }

  await ensureUserThemeSchema();
  await ensurePremiumModeSchema();

  if (body?.palette !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "themePreference" = ? WHERE "id" = ?`,
      body.palette,
      session.user.id,
    );
  }

  if (body?.premium !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "premiumMode" = ? WHERE "id" = ?`,
      body.premium ? 1 : 0,
      session.user.id,
    );
  }

  return NextResponse.json({
    palette: body?.palette ?? "default",
    premium: !!body?.premium,
  });
}
