import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { sendEmail } from "@/lib/email/email-service";
import type { EmailAttachment } from "@/lib/email/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.INVOICE_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const enabled = await getFeatureFlag(FEATURE_FLAG_KEYS.emailEngine);
  if (!enabled) {
    return NextResponse.json({ error: "Email engine is disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body?.to) {
    return NextResponse.json({ error: "Recipient (to) is required" }, { status: 400 });
  }

  const attachments: EmailAttachment[] = Array.isArray(body.attachments)
    ? body.attachments
        .filter((a: any) => a?.fileName && a?.contentBase64)
        .map((a: any) => ({
          fileName: String(a.fileName),
          mimeType: String(a.mimeType || "application/pdf"),
          content: Buffer.from(String(a.contentBase64), "base64"),
        }))
    : [];

  const result = await sendEmail({
    to: body.to,
    subject: body.subject,
    html: body.html,
    text: body.text,
    templateKey: body.templateKey,
    variables: body.variables,
    customerId: body.customerId ?? null,
    orderId: body.orderId ?? null,
    emailType: body.emailType,
    attachments,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
