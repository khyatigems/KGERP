import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureNotesSchema } from "@/lib/notes";
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !/^[a-f0-9-]{36}$/.test(token))
    return new NextResponse("Not found", { status: 404 });
  await ensureNotesSchema();
  const rows = await prisma.$queryRawUnsafe<
    { title: string; content: string }[]
  >(
    `SELECT d.title, n.content FROM "NoteDetails" d JOIN "DashboardNote" n ON n.id = d.noteId WHERE d.shareToken = ? AND d.state = 'active'`,
    token,
  );
  if (!rows[0])
    return new NextResponse("This link is unavailable or has been revoked.", {
      status: 404,
    });
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Shared note | Khyati Gems</title></head><body style="font:16px system-ui;background:#f5f5f4;color:#1c1917;padding:24px"><main style="max-width:800px;margin:40px auto;background:white;padding:32px;border-radius:16px"><p>K H Y A T I &nbsp; G E M S · SHARED KNOWLEDGE</p><h1>${escape(rows[0].title || "Untitled note")}</h1><pre style="white-space:pre-wrap;font:inherit;line-height:1.7;overflow-wrap:anywhere">${escape(rows[0].content)}</pre></main></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
