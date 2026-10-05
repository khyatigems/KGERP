import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW))) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  await ensureMarketplaceFoundationSchema();
  const { id } = await params;
  const email = await prisma.emailLog.findUnique({ where: { id }, select: { bodyHtml: true } });
  if (!email) return new NextResponse("Communication not found", { status: 404 });
  if (!email.bodyHtml) return new NextResponse("HTML content is unavailable", { status: 404 });
  return new NextResponse(email.bodyHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
