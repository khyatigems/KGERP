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
    htmlBody: "<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for your purchase on {{purchase_date}}. Please find your invoice <strong>{{invoice_number}}</strong> attached for your records.</p><p>{{order_number_line}}</p><p>If you have any questions, reply to this email or contact us at <a href=\"mailto:support@khyatigems.com\">support@khyatigems.com</a>.</p><p>Kind regards,<br/>KhyatiGems</p>",
    plainTextBody: "Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for your purchase on {{purchase_date}}. Please find your invoice {{invoice_number}} attached for your records.\n{{order_number_line}}\n\nIf you have any questions, reply to this email or contact us at support@khyatigems.com.\n\nKind regards,\nKhyatiGems",
  },
  {
    key: "email_certificate",
    title: "Certificate Email",
    subject: "Your Gemstone Certificate {{certificate_number}}",
    htmlBody: "<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for choosing KhyatiGems. We are pleased to share the certificate for your purchase made on <strong>{{purchase_date}}</strong>.</p><p>The certificate for <strong>{{gemstone_name}}</strong> (Certificate No. <strong>{{certificate_number}}</strong>) is attached to this email. Please keep the PDF with your purchase records.</p><p>{{order_number_line}}</p><p>You can also check your certificate online using the button below:</p><p style=\"margin:24px 0;text-align:center;\"><a href=\"{{certificate_verification_url}}\" target=\"_blank\" style=\"display:inline-block;padding:14px 24px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:700;\">Verify Your Certificate Online</a></p><p>If the verification page asks for a certificate number, enter <strong>{{certificate_number}}</strong>.</p><p>If you have questions about your gemstone or certificate, reply to this email or contact us at <a href=\"mailto:support@khyatigems.com\">support@khyatigems.com</a>. We will be happy to assist.</p><p>Thank you for your trust in KhyatiGems.</p><p>Kind regards,<br/>KhyatiGems</p>",
    plainTextBody: "Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for choosing KhyatiGems. We are pleased to share the certificate for your purchase made on {{purchase_date}}.\n\nThe certificate for {{gemstone_name}} (Certificate No. {{certificate_number}}) is attached to this email. Please keep the PDF with your purchase records.\n{{order_number_line}}\n\nYou can also verify your certificate online at:\n{{certificate_verification_url}}\n\nIf the verification page asks for a certificate number, enter {{certificate_number}}.\n\nIf you have questions about your gemstone or certificate, reply to this email or contact us at support@khyatigems.com. We will be happy to assist.\n\nThank you for your trust in KhyatiGems.\n\nKind regards,\nKhyatiGems",
  },
  {
    key: "email_certificate_invoice",
    title: "Certificate + Invoice Email",
    subject: "Your Invoice {{invoice_number}} and Certificate from {{company_name}}",
    htmlBody: "<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for choosing KhyatiGems. This email contains the documents for your purchase made on <strong>{{purchase_date}}</strong>.</p><p>Attached for your records are:</p><ul><li>Invoice <strong>{{invoice_number}}</strong></li><li>Certificate No. <strong>{{certificate_number}}</strong> for <strong>{{gemstone_name}}</strong></li></ul><p>{{order_number_line}}</p><p>For your convenience, you can check the certificate online using the button below:</p><p style=\"margin:24px 0;text-align:center;\"><a href=\"{{certificate_verification_url}}\" target=\"_blank\" style=\"display:inline-block;padding:14px 24px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:700;\">Verify Your Certificate Online</a></p><p>If the verification page asks for a certificate number, enter <strong>{{certificate_number}}</strong>.</p><p>Please retain the attached invoice and certificate for your records. If you need assistance with your purchase or certificate, reply to this email or contact us at <a href=\"mailto:support@khyatigems.com\">support@khyatigems.com</a>.</p><p>Thank you for your trust in KhyatiGems.</p><p>Kind regards,<br/>KhyatiGems</p>",
    plainTextBody: "Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for choosing KhyatiGems. This email contains the documents for your purchase made on {{purchase_date}}.\n\nAttached for your records are:\n- Invoice {{invoice_number}}\n- Certificate No. {{certificate_number}} for {{gemstone_name}}\n{{order_number_line}}\n\nFor your convenience, you can verify the certificate online at:\n{{certificate_verification_url}}\n\nIf the verification page asks for a certificate number, enter {{certificate_number}}.\n\nPlease retain the attached invoice and certificate for your records. If you need assistance with your purchase or certificate, reply to this email or contact us at support@khyatigems.com.\n\nThank you for your trust in KhyatiGems.\n\nKind regards,\nKhyatiGems",
  },
];

const PREVIOUS_DEFAULT_EMAIL_TEMPLATES = [
  {
    key: "email_certificate",
    subject: "Your Gemstone Certificate {{certificate_number}}",
    html: "<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for your purchase on {{purchase_date}}. Please find the certificate <strong>{{certificate_number}}</strong> for {{gemstone_name}} attached for your records.</p><p>{{order_number_line}}</p><p>If you have any questions, reply to this email or contact us at <a href=\"mailto:support@khyatigems.com\">support@khyatigems.com</a>.</p><p>Kind regards,<br/>KhyatiGems</p>",
    text: "Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for your purchase on {{purchase_date}}. Please find the certificate {{certificate_number}} for {{gemstone_name}} attached for your records.\n{{order_number_line}}\n\nIf you have any questions, reply to this email or contact us at support@khyatigems.com.\n\nKind regards,\nKhyatiGems",
  },
  {
    key: "email_certificate_invoice",
    subject: "Your Invoice {{invoice_number}} and Certificate from {{company_name}}",
    html: "<p>Dear {{customer_name}},</p><p>Greetings from {{company_name}}.</p><p>Thank you for your purchase on {{purchase_date}}. Please find your invoice <strong>{{invoice_number}}</strong> and certificate <strong>{{certificate_number}}</strong> for {{gemstone_name}} attached for your records.</p><p>{{order_number_line}}</p><p>If you have any questions, reply to this email or contact us at <a href=\"mailto:support@khyatigems.com\">support@khyatigems.com</a>.</p><p>Kind regards,<br/>KhyatiGems</p>",
    text: "Dear {{customer_name}},\n\nGreetings from {{company_name}}.\n\nThank you for your purchase on {{purchase_date}}. Please find your invoice {{invoice_number}} and certificate {{certificate_number}} for {{gemstone_name}} attached for your records.\n{{order_number_line}}\n\nIf you have any questions, reply to this email or contact us at support@khyatigems.com.\n\nKind regards,\nKhyatiGems",
  },
  {
    key: "email_invoice",
    subject: "Your Invoice {{invoice_number}} from {{company_name}}",
    html: "<p>Hi {{customer_name}},</p><p>Thank you for your purchase from {{company_name}} on {{purchase_date}}.</p><p>Please find invoice {{invoice_number}} attached.</p><p>{{order_number_line}}</p><p>Warm regards,<br/>Team {{company_name}}</p>",
    text: "Hi {{customer_name}},\n\nThank you for your purchase from {{company_name}} on {{purchase_date}}.\n\nPlease find invoice {{invoice_number}} attached.\n{{order_number_line}}\n\nWarm regards,\nTeam {{company_name}}",
  },
  {
    key: "email_certificate",
    subject: "Your Gemstone Certificate {{certificate_number}}",
    html: "<p>Hi {{customer_name}},</p><p>Thank you for your purchase from {{company_name}} on {{purchase_date}}.</p><p>Please find the certificate {{certificate_number}} for {{gemstone_name}} attached.</p><p>{{order_number_line}}</p><p>Warm regards,<br/>Team {{company_name}}</p>",
    text: "Hi {{customer_name}},\n\nThank you for your purchase from {{company_name}} on {{purchase_date}}.\n\nPlease find the certificate {{certificate_number}} for {{gemstone_name}} attached.\n{{order_number_line}}\n\nWarm regards,\nTeam {{company_name}}",
  },
  {
    key: "email_certificate_invoice",
    subject: "Your Invoice {{invoice_number}} and Certificate from {{company_name}}",
    html: "<p>Hi {{customer_name}},</p><p>Thank you for your purchase from {{company_name}} on {{purchase_date}}.</p><p>Please find your invoice {{invoice_number}} and certificate {{certificate_number}} for {{gemstone_name}} attached.</p><p>{{order_number_line}}</p><p>Warm regards,<br/>Team {{company_name}}</p>",
    text: "Hi {{customer_name}},\n\nThank you for your purchase from {{company_name}} on {{purchase_date}}.\n\nPlease find your invoice {{invoice_number}} and certificate {{certificate_number}} for {{gemstone_name}} attached.\n{{order_number_line}}\n\nWarm regards,\nTeam {{company_name}}",
  },
];

const LEGACY_DEFAULT_EMAIL_TEMPLATES = [
  {
    key: "email_invoice",
    subject: "Your Invoice {{invoice_number}} from {{company_name}}",
    html: "<p>Dear {{customer_name}},</p><p>Thank you for your order {{order_number}}. Your invoice {{invoice_number}} is attached.</p><p>Warm regards,<br/>{{company_name}}</p>",
    text: "Dear {{customer_name}},\n\nThank you for your order {{order_number}}. Your invoice {{invoice_number}} is attached.\n\nWarm regards,\n{{company_name}}",
  },
  {
    key: "email_certificate",
    subject: "Your Gemstone Certificate {{certificate_number}}",
    html: "<p>Dear {{customer_name}},</p><p>Your certificate {{certificate_number}} for {{gemstone_name}} is attached.</p><p>Warm regards,<br/>{{company_name}}</p>",
    text: "Dear {{customer_name}},\n\nYour certificate {{certificate_number}} for {{gemstone_name}} is attached.\n\nWarm regards,\n{{company_name}}",
  },
  {
    key: "email_certificate_invoice",
    subject: "Your Certificate & Invoice ({{order_number}})",
    html: "<p>Dear {{customer_name}},</p><p>Thank you for your order {{order_number}}. Your certificate {{certificate_number}} and invoice {{invoice_number}} are attached.</p><p>Warm regards,<br/>{{company_name}}</p>",
    text: "Dear {{customer_name}},\n\nThank you for your order {{order_number}}. Your certificate {{certificate_number}} and invoice {{invoice_number}} are attached.\n\nWarm regards,\n{{company_name}}",
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
      const previousDefaults = [
        ...LEGACY_DEFAULT_EMAIL_TEMPLATES,
        ...PREVIOUS_DEFAULT_EMAIL_TEMPLATES,
      ].filter((item) => item.key === template.key);
      for (const previousDefault of previousDefaults) {
        await prisma.$executeRawUnsafe(
          `UPDATE "MessageTemplate"
           SET subject = ?, htmlBody = ?, plainTextBody = ?, body = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE key = ? AND channel = 'EMAIL' AND subject = ? AND htmlBody = ? AND plainTextBody = ?`,
          template.subject,
          template.htmlBody,
          template.plainTextBody,
          template.plainTextBody,
          template.key,
          previousDefault.subject,
          previousDefault.html,
          previousDefault.text,
        );
      }
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
