"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mail, FileText, Award } from "lucide-react";
import {
  emailInvoiceAction,
  emailCertificateAction,
  emailInvoiceAndCertificateAction,
} from "@/app/(dashboard)/invoices/email-actions";

type EmailActionResult = {
  success: boolean;
  message?: string;
  steps?: Array<{ label: string; ms: number }>;
};

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function EmailDocumentButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState<"invoice" | "certificate" | "both" | null>(null);

  const run = async (
    key: "invoice" | "certificate" | "both",
    label: string,
    action: (id: string) => Promise<EmailActionResult>
  ) => {
    setLoading(key);
    const started = Date.now();
    const toastId = toast.loading(`${label}…`, { description: "Starting…" });
    try {
      const result = await action(invoiceId);
      const total = Date.now() - started;
      if (result.success) {
        const lines = result.steps?.map((s) => `• ${s.label} — ${formatSeconds(s.ms)}`).join("\n");
        toast.success(`${label} sent in ${formatSeconds(total)}`, {
          id: toastId,
          description: lines || undefined,
          duration: Infinity,
          action: { label: "OK", onClick: () => toast.dismiss(toastId) },
        });
      } else {
        toast.error(result.message ?? "Failed to send", { id: toastId });
      }
    } catch {
      toast.error("Failed to send email", { id: toastId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run("invoice", "Email Invoice", emailInvoiceAction)}
        disabled={loading !== null}
      >
        <Mail className="mr-2 h-4 w-4" />
        {loading === "invoice" ? "Sending…" : "Email Invoice"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run("certificate", "Email Certificate", emailCertificateAction)}
        disabled={loading !== null}
      >
        <Award className="mr-2 h-4 w-4" />
        {loading === "certificate" ? "Sending…" : "Email Certificate"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => run("both", "Email Invoice + Certificate", emailInvoiceAndCertificateAction)}
        disabled={loading !== null}
      >
        <FileText className="mr-2 h-4 w-4" />
        {loading === "both" ? "Sending…" : "Email Invoice + Certificate"}
      </Button>
    </>
  );
}
