import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_VIEW);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, index: rawIndex } = await params;
  const index = Number.parseInt(rawIndex, 10);
  if (!Number.isInteger(index) || index < 0) return NextResponse.json({ error: "Invalid attachment index" }, { status: 400 });
  await ensureMarketplaceFoundationSchema();
  const email = await prisma.emailLog.findUnique({ where: { id }, select: { payloadJson: true } });
  if (!email) return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  let payload: { attachments?: Array<{ fileName: string; mimeType: string; contentBase64: string }> } | null = null;
  try {
    payload = email.payloadJson ? JSON.parse(email.payloadJson) : null;
  } catch (error) {
    console.error("[communication-attachment] Invalid stored payload:", error);
    return NextResponse.json({ error: "Stored attachment data is invalid" }, { status: 500 });
  }
  const attachment = payload?.attachments?.[index];
  if (!attachment) return NextResponse.json({ error: "Attachment content is unavailable" }, { status: 404 });

  const safeName = attachment.fileName.replace(/[\r\n"\\]/g, "_");
  const mimeType =
    /^[\w.+-]+\/[\w.+-]+$/.test(attachment.mimeType) ? attachment.mimeType : "application/octet-stream";
  const canDisplayInline =
    mimeType === "application/pdf" || /^image\/(?:png|jpe?g|gif|webp)$/.test(mimeType);
  const inline = request.nextUrl.searchParams.get("inline") === "1";
  if (inline && !canDisplayInline) {
    return NextResponse.json({ error: "This attachment type cannot be previewed" }, { status: 415 });
  }
  return new NextResponse(new Uint8Array(Buffer.from(attachment.contentBase64, "base64")), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(inline ? { "Content-Security-Policy": "default-src 'none'; sandbox" } : {}),
    },
  });
}
