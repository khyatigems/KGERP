import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatch } from "@/lib/weekly-report/service";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
 const expected = process.env.CRON_SECRET || "", provided = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
 if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 try { return NextResponse.json(await dispatch()); } catch { return NextResponse.json({ error: "Weekly report dispatch failed; inspect report history" }, { status: 500 }); }
}
