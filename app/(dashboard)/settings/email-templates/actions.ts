"use server";

import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import {
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  toggleEmailTemplate,
} from "@/lib/email/templates";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { loadZohoOAuthTokens } from "@/lib/email/oauth";
import { pollZohoInbox } from "@/lib/email/inbound";

export async function getEmailTemplates() {
  return listEmailTemplates();
}

export async function createEmailTemplateAction(payload: {
  key: string;
  title: string;
  subject: string;
  htmlBody?: string;
  plainTextBody?: string;
}) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const result = await createEmailTemplate(payload);
  revalidatePath("/settings/email-templates");
  return result;
}

export async function updateEmailTemplateAction(payload: {
  id: string;
  title?: string;
  subject?: string;
  htmlBody?: string;
  plainTextBody?: string;
}) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const result = await updateEmailTemplate(payload);
  revalidatePath("/settings/email-templates");
  return result;
}

export async function toggleEmailTemplateAction(id: string, active: boolean) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const result = await toggleEmailTemplate(id, active);
  revalidatePath("/settings/email-templates");
  return result;
}

export async function getZohoConnectionStatus() {
  const connector = new ZohoMailConnector();
  const tokens = await loadZohoOAuthTokens();
  return { configured: connector.isConfigured(), connected: Boolean(tokens?.accessToken) };
}

export async function pollZohoInboxAction() {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { processed: 0, error: perm.message ?? "Forbidden" };
  const result = await pollZohoInbox();
  revalidatePath("/settings/email-templates");
  return result;
}
