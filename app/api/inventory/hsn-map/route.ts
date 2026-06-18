import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await (prisma as any).gpisSettings.findFirst();
    const json = settings?.categoryHsnJson;
    if (!json || typeof json !== "string") {
      return NextResponse.json({ map: {} });
    }
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ map: {} });
    }
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string" && k.trim() && v.trim()) {
        map[k.trim()] = v.trim();
      }
    }
    return NextResponse.json({ map });
  } catch {
    return NextResponse.json({ map: {} });
  }
}
