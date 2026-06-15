import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.companySettings.findFirst({
      select: { logoUrl: true, companyName: true },
    });
    return NextResponse.json({
      logoUrl: settings?.logoUrl ?? null,
      companyName: settings?.companyName || "Khyati Gems",
    });
  } catch {
    return NextResponse.json({ logoUrl: null, companyName: "Khyati Gems" });
  }
}
