import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCompanionAttention } from "@/lib/companion-attention";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getCompanionAttention(session.user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Business attention is temporarily unavailable" }, { status: 503 });
  }
}
