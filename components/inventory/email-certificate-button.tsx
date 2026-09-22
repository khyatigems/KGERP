"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { emailCertificateForInventoryAction } from "@/app/(dashboard)/inventory/email-actions";

export function EmailCertificateButton({ inventoryId }: { inventoryId: string }) {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      const result = await emailCertificateForInventoryAction(inventoryId);
      if (result.success) toast.success(result.message ?? "Certificate emailed");
      else toast.error(result.message ?? "Failed to send");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      <Mail className="mr-2 h-4 w-4" />
      {loading ? "Sending…" : "Email Certificate"}
    </Button>
  );
}
