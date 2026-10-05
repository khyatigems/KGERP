"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import {
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  toggleEmailTemplate,
} from "@/lib/email/templates";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { loadZohoOAuthTokens, clearZohoOAuthTokens } from "@/lib/email/oauth";
import { pollZohoInbox } from "@/lib/email/inbound";
import { logActivity } from "@/lib/activity-logger";

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
  const connected = Boolean(tokens?.accessToken);
  const account = connected ? await connector.getConnectedAccount() : null;
  return {
    configured: connector.isConfigured(),
    connected,
    email: account?.email || null,
  };
}

export async function pollZohoInboxAction() {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { processed: 0, error: perm.message ?? "Forbidden" };
  const result = await pollZohoInbox();
  revalidatePath("/settings/email-templates");
  return result;
}

export async function disconnectZohoAction() {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };

  await clearZohoOAuthTokens();

  await logActivity({
    entityType: "Security",
    entityIdentifier: "zoho-mail-disconnect",
    actionType: "STATUS_CHANGE",
    module: "Settings",
    action: "Disconnect Zoho Mail",
    description: "Zoho Mail OAuth connection removed",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
  });

  revalidatePath("/settings/email-templates");
  return { success: true };
}
