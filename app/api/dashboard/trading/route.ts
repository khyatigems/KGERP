import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTradingDashboard } from "@/lib/trading-dashboard";
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getTradingDashboard(session.user.id, request.nextUrl.searchParams.get("refresh") === "1");
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Trading dashboard failed", error);
    return NextResponse.json({ error: "Unable to load dashboard" }, { status: 500 });
  }
}
