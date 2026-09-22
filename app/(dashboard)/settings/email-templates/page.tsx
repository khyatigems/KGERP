import type { Metadata } from "next";
import { listEmailTemplates } from "@/lib/email/templates";
import { getZohoConnectionStatus } from "./actions";
import { EmailTemplatesForm } from "./email-templates-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Templates",
  robots: { index: false, follow: false },
};

export default async function EmailTemplatesPage() {
  const templates = await listEmailTemplates();
  const zohoStatus = await getZohoConnectionStatus();
  return <EmailTemplatesForm templates={templates} zohoStatus={zohoStatus} />;
}
