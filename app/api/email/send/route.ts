import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { sendEmail } from "@/lib/email/email-service";
import type { EmailAttachment } from "@/lib/email/types";
import type { TemplateVariables } from "@/lib/email/template-renderer";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.INVOICE_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const enabled = await getFeatureFlag(FEATURE_FLAG_KEYS.emailEngine);
  if (!enabled) {
    return NextResponse.json({ error: "Email engine is disabled" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A valid email request body is required" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.to !== "string" || !input.to.trim()) {
    return NextResponse.json({ error: "Recipient (to) is required" }, { status: 400 });
  }

  if (input.attachments !== undefined && !Array.isArray(input.attachments)) {
    return NextResponse.json({ error: "Attachments must be an array" }, { status: 400 });
  }
  const attachments: EmailAttachment[] = [];
  for (const value of (input.attachments || []) as unknown[]) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>).fileName !== "string" ||
      typeof (value as Record<string, unknown>).contentBase64 !== "string"
    ) {
      return NextResponse.json({ error: "Each attachment requires a file name and base64 content" }, { status: 400 });
    }
    const attachment = value as Record<string, unknown>;
    const contentBase64 = attachment.contentBase64 as string;
    if (!contentBase64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
      return NextResponse.json({ error: "Attachment content must be valid base64" }, { status: 400 });
    }
    attachments.push({
      fileName: (attachment.fileName as string).trim(),
      mimeType: typeof attachment.mimeType === "string" ? attachment.mimeType : "application/pdf",
      content: Buffer.from(contentBase64, "base64"),
    });
  }
  const readStringArray = (value: unknown): string[] | null => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) return null;
    return value.map((entry) => entry.trim()).filter(Boolean);
  };
  const cc = readStringArray(input.cc);
  const bcc = readStringArray(input.bcc);
  if (!cc || !bcc) return NextResponse.json({ error: "CC and BCC must be arrays of email addresses" }, { status: 400 });
  const variables =
    input.variables && typeof input.variables === "object" && !Array.isArray(input.variables)
      ? Object.fromEntries(
          Object.entries(input.variables).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : undefined;

  const result = await sendEmail({
    to: input.to,
    subject: typeof input.subject === "string" ? input.subject : undefined,
    html: typeof input.html === "string" ? input.html : undefined,
    text: typeof input.text === "string" ? input.text : undefined,
    cc,
    bcc,
    templateKey: typeof input.templateKey === "string" ? input.templateKey : undefined,
    variables: variables as TemplateVariables | undefined,
    customerId: typeof input.customerId === "string" ? input.customerId : null,
    orderId: typeof input.orderId === "string" ? input.orderId : null,
    emailType: typeof input.emailType === "string" ? input.emailType : undefined,
    attachments,
  });

  if (result.logId) {
    await logActivity({
      module: "communication",
      action: "email.send",
      entityType: "EmailLog",
      entityId: result.logId,
      referenceId: result.logId,
      entityIdentifier: typeof input.subject === "string" && input.subject.trim()
        ? `Subject: ${input.subject.trim()}`
        : "Email message",
      description: result.success ? "Email sent" : "Email delivery failed",
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      metadata: {
        resultStatus: result.status,
        customerId: typeof input.customerId === "string" ? input.customerId : null,
        orderId: typeof input.orderId === "string" ? input.orderId : null,
      },
    });
  }
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
