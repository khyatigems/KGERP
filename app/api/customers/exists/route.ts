import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const phone = (request.nextUrl.searchParams.get("phone") || "").trim();
  if (!phone) return NextResponse.json({ exists: false });
  const exists = await prisma.customer.findFirst({ where: { phone } });
  return NextResponse.json({ exists: !!exists, customer: exists ? { id: exists.id, name: exists.name } : null });
}

