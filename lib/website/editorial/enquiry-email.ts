import { websiteDb } from "./database";
import type {
  SendEmailInput,
  SendEmailResult,
} from "@/lib/email/email-service";
import { websiteEnquiryTemplate } from "@/lib/email/website-enquiry-template";
import { enquiryReference } from "./enquiry-reference";

type Services = {
  template: () => Promise<{ isActive: number } | null>;
  send: (input: SendEmailInput) => Promise<SendEmailResult>;
};
export async function acknowledgeEnquiry(id: string, services?: Services) {
  const db = websiteDb();
  await ensureEnquiryEmailSchema();
  const found = await db.execute({
    sql: "SELECT name,email,subject FROM WebsiteEnquiry WHERE id=?",
    args: [id],
  });
  if (!found.rows.length) throw new Error("Enquiry not found");
  const claim = await db.execute({
    sql: "INSERT INTO WebsiteEnquiryEmail(enquiryId,status,updatedAt) VALUES(?,'sending',?) ON CONFLICT(enquiryId) DO UPDATE SET status='sending',updatedAt=excluded.updatedAt WHERE WebsiteEnquiryEmail.status IN ('failed','disabled','pending') OR (WebsiteEnquiryEmail.status='sending' AND WebsiteEnquiryEmail.updatedAt<?) RETURNING enquiryId",
    args: [
      id,
      new Date().toISOString(),
      new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    ],
  });
  if (!claim.rows.length) {
    const existing = await db.execute({
      sql: "SELECT status FROM WebsiteEnquiryEmail WHERE enquiryId=?",
      args: [id],
    });
    return String(existing.rows[0]?.status || "pending");
  }
  let status = "failed",
    logId = "";
  try {
    if (!services) {
      const { getEmailTemplateByKey } = await import("@/lib/email/templates");
      const { sendEmail } = await import("@/lib/email/email-service");
      services = {
        template: () => getEmailTemplateByKey(websiteEnquiryTemplate.key),
        send: sendEmail,
      };
    }
    const template = await services.template();
    if (!template || !template.isActive) status = "disabled";
    else {
      const row = found.rows[0];
      const outcome = await services.send({
        to: String(row.email),
        templateKey: websiteEnquiryTemplate.key,
        variables: {
          customer_name: String(row.name),
          enquiry_reference: await enquiryReference(id),
          enquiry_subject: String(row.subject),
        },
        emailType: "WEBSITE_ENQUIRY_ACKNOWLEDGEMENT",
        idempotencyKey: `website-enquiry:${id}:acknowledgement`,
      });
      status =
        outcome.status === "SENT"
          ? "sent"
          : outcome.success && outcome.status === "QUEUED"
            ? "queued"
            : "failed";
      logId = outcome.logId;
    }
  } catch {
    status = "failed";
  }
  await db.execute({
    sql: "UPDATE WebsiteEnquiryEmail SET status=?,logId=?,updatedAt=? WHERE enquiryId=?",
    args: [status, logId || null, new Date().toISOString(), id],
  });
  return status;
}

export async function ensureEnquiryEmailSchema() {
  await websiteDb().execute(
    "CREATE TABLE IF NOT EXISTS WebsiteEnquiryEmail (enquiryId TEXT PRIMARY KEY REFERENCES WebsiteEnquiry(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'pending', logId TEXT, updatedAt TEXT NOT NULL)",
  );
}
