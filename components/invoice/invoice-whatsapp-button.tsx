"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { generateInvoicePDF, type InvoiceData } from "@/lib/invoice-generator";

export function InvoiceWhatsAppButton({
  invoiceId,
  data,
}: {
  invoiceId: string;
  data: InvoiceData;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const whatsappWindow = window.open("about:blank", "_blank");
    if (!whatsappWindow) {
      toast.error("Allow pop-ups to open WhatsApp after downloading the invoice.");
      return;
    }
    whatsappWindow.document.title = "Preparing WhatsApp";
    whatsappWindow.document.body.textContent = "Preparing invoice and WhatsApp message…";
    setBusy(true);
    try {
      const pdf = await generateInvoicePDF(data);
      const downloadUrl = URL.createObjectURL(pdf);
      const download = document.createElement("a");
      download.href = downloadUrl;
      download.download = `Invoice-${data.invoiceNumber}.pdf`;
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/whatsapp-launch`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || typeof result.whatsappUrl !== "string") {
        throw new Error(result.error || "Could not prepare the WhatsApp message");
      }
      whatsappWindow.location.href = result.whatsappUrl;
      toast.success("Invoice downloaded. Attach the PDF in WhatsApp Web and send when ready.");
    } catch (error) {
      whatsappWindow.close();
      toast.error(error instanceof Error ? error.message : "Could not prepare the invoice for WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {busy ? "Preparing…" : "Download & Open WhatsApp"}
    </button>
  );
}
