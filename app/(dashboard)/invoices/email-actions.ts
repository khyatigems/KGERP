"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { sendOrderDocumentsEmail } from "@/lib/email/order-email-flow";

async function guard() {
  const perm = await checkPermission(PERMISSIONS.INVOICE_MANAGE);
  if (!perm.success) return { error: perm.message };
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  const enabled = await getFeatureFlag(FEATURE_FLAG_KEYS.emailEngine);
  if (!enabled) return { error: "Email engine is disabled" };
  return { session };
}

export async function emailInvoiceAction(invoiceId: string) {
  const g = await guard();
  if (g.error) return { success: false, message: g.error };
  const result = await sendOrderDocumentsEmail(invoiceId, {
    includeInvoice: true,
    includeCertificate: false,
  });
  revalidatePath(`/invoices/${invoiceId}`);
  return result;
}

export async function emailCertificateAction(invoiceId: string) {
  const g = await guard();
  if (g.error) return { success: false, message: g.error };
  const result = await sendOrderDocumentsEmail(invoiceId, {
    includeInvoice: false,
    includeCertificate: true,
  });
  revalidatePath(`/invoices/${invoiceId}`);
  return result;
}

export async function emailInvoiceAndCertificateAction(invoiceId: string) {
  const g = await guard();
  if (g.error) return { success: false, message: g.error };
  const result = await sendOrderDocumentsEmail(invoiceId, {
    includeInvoice: true,
    includeCertificate: true,
  });
  revalidatePath(`/invoices/${invoiceId}`);
  return result;
}
