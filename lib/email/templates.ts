import crypto from "crypto";
import { prisma, ensureBillfreePhase1Schema } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";

export interface EmailTemplateRow {
  id: string;
  key: string;
  title: string;
  subject: string;
  htmlBody: string | null;
  plainTextBody: string | null;
  isActive: number;
  channel: string;
}

const DEFAULT_EMAIL_TEMPLATES: Array<{
  key: string;
  title: string;
  subject: string;
  htmlBody: string;
  plainTextBody: string;
}> = [
  {
    key: "email_invoice",
    title: "Invoice Email",
    subject: "Your Invoice {{invoice_number}} from {{company_name}}",
    htmlBody: "<p>Dear {{customer_name}},</p><p>Thank you for your order {{order_number}}. Your invoice {{invoice_number}} is attached.</p><p>Warm regards,<br/>{{company_name}}</p>",
    plainTextBody: "Dear {{customer_name}},\n\nThank you for your order {{order_number}}. Your invoice {{invoice_number}} is attached.\n\nWarm regards,\n{{company_name}}",
  },
  {
    key: "email_certificate",
    title: "Certificate Email",
    subject: "Your Gemstone Certificate {{certificate_number}}",
    htmlBody: "<p>Dear {{customer_name}},</p><p>Your certificate {{certificate_number}} for {{gemstone_name}} is attached.</p><p>Warm regards,<br/>{{company_name}}</p>",
    plainTextBody: "Dear {{customer_name}},\n\nYour certificate {{certificate_number}} for {{gemstone_name}} is attached.\n\nWarm regards,\n{{company_name}}",
  },
  {
    key: "email_certificate_invoice",
    title: "Certificate + Invoice Email",
    subject: "Your Certificate & Invoice ({{order_number}})",
    htmlBody: "<p>Dear {{customer_name}},</p><p>Thank you for your order {{order_number}}. Your certificate {{certificate_number}} and invoice {{invoice_number}} are attached.</p><p>Warm regards,<br/>{{company_name}}</p>",
    plainTextBody: "Dear {{customer_name}},\n\nThank you for your order {{order_number}}. Your certificate {{certificate_number}} and invoice {{invoice_number}} are attached.\n\nWarm regards,\n{{company_name}}",
  },
];

async function ensureDefaultEmailTemplates(): Promise<void> {
  await ensureBillfreePhase1Schema();
  await ensureMarketplaceFoundationSchema();
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "MessageTemplate" ("id", "key", "title", "body", "channel", "isActive", "subject", "htmlBody", "plainTextBody", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, 'EMAIL', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        crypto.randomUUID(),
        template.key,
        template.title,
        template.plainTextBody,
        template.subject,
        template.htmlBody,
        template.plainTextBody
      );
    } catch (error) {
      console.error(`[email-templates] failed to seed ${template.key}:`, error);
    }
  }
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  await ensureDefaultEmailTemplates();
  return prisma.$queryRawUnsafe<EmailTemplateRow[]>(
    `SELECT id, key, title, subject, htmlBody, plainTextBody, isActive, channel
     FROM "MessageTemplate" WHERE channel = 'EMAIL' ORDER BY createdAt DESC LIMIT 200`
  ).catch(() => []);
}

export async function getEmailTemplateByKey(key: string): Promise<EmailTemplateRow | null> {
  await ensureBillfreePhase1Schema();
  await ensureMarketplaceFoundationSchema();
  const rows = await prisma.$queryRawUnsafe<EmailTemplateRow[]>(
    `SELECT id, key, title, subject, htmlBody, plainTextBody, isActive, channel
     FROM "MessageTemplate" WHERE key = ? AND channel = 'EMAIL' LIMIT 1`,
    key
  ).catch(() => []);
  return rows[0] ?? null;
}

export async function createEmailTemplate(input: {
  key: string;
  title: string;
  subject: string;
  htmlBody?: string;
  plainTextBody?: string;
}): Promise<{ success: boolean; message?: string }> {
  const key = String(input.key || "").trim().toLowerCase();
  const title = String(input.title || "").trim();
  const subject = String(input.subject || "").trim();
  if (!key || !title || !subject) {
    return { success: false, message: "Key, title and subject are required" };
  }
  await ensureBillfreePhase1Schema();
  await ensureMarketplaceFoundationSchema();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "MessageTemplate" ("id", "key", "title", "body", "channel", "isActive", "subject", "htmlBody", "plainTextBody", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, 'EMAIL', 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    key,
    title,
    input.plainTextBody || "",
    subject,
    input.htmlBody || null,
    input.plainTextBody || null
  );
  return { success: true };
}

export async function updateEmailTemplate(input: {
  id: string;
  title?: string;
  subject?: string;
  htmlBody?: string;
  plainTextBody?: string;
}): Promise<{ success: boolean; message?: string }> {
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "MessageTemplate" WHERE id = ? AND channel = 'EMAIL' LIMIT 1`,
    input.id
  ).catch(() => []);
  if (!existing[0]) return { success: false, message: "Email template not found" };

  await prisma.$executeRawUnsafe(
    `UPDATE "MessageTemplate" SET title = ?, subject = ?, htmlBody = ?, plainTextBody = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    input.title ?? null,
    input.subject ?? null,
    input.htmlBody ?? null,
    input.plainTextBody ?? null,
    input.id
  );
  return { success: true };
}

export async function toggleEmailTemplate(id: string, active: boolean): Promise<{ success: boolean }> {
  await ensureBillfreePhase1Schema();
  await ensureMarketplaceFoundationSchema();
  await prisma.$executeRawUnsafe(
    `UPDATE "MessageTemplate" SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    active ? 1 : 0,
    id
  );
  return { success: true };
}
