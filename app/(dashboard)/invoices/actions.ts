"use server";

import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function updateInvoicePaymentStatus(invoiceId: string, status: "PAID" | "UNPAID" | "PARTIAL") {
  const perm = await checkPermission(PERMISSIONS.INVOICE_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };

  try {
    // 1. Update the Invoice status (optional, but good for consistency if the invoice model tracks it)
    // Note: The Invoice model has a 'status' field (DRAFT, ISSUED, PAID, CANCELLED).
    // If we set payment to PAID, we should probably update invoice status to PAID too if it was ISSUED.
    
    // 2. Update all linked Sale records
    await prisma.sale.updateMany({
      where: { invoiceId },
      data: { paymentStatus: status }
    });

    // 3. Update Invoice status if needed
    if (status === "PAID") {
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: "PAID" }
        });
    } else if (status === "UNPAID") {
        // Revert to ISSUED if it was PAID? Or just keep as ISSUED.
        // We'll check current status first.
        const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (inv?.status === "PAID") {
            await prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: "ISSUED" }
            });
        }
    }

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    
    return { success: true, message: "Payment status updated" };
  } catch (error) {
    console.error("Failed to update payment status:", error);
    return { success: false, message: "Failed to update payment status" };
  }
}
