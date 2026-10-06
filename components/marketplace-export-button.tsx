"use client";

import { useState } from "react";
import { ExportButton } from "@/components/ui/lottie";
import { toast } from "sonner";

function filenameFromResponse(response: Response, href: string): string {
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  try {
    const report = new URL(href, window.location.origin).searchParams.get("report");
    if (report) return `marketplace-${report}-report.xlsx`;
  } catch {
    // fall through to default
  }
  return "marketplace-report.xlsx";
}

export function MarketplaceExportButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(href, { credentials: "same-origin" });

      if (!response.ok) {
        let message = `Export failed (HTTP ${response.status})`;
        try {
          const data = await response.json();
          if (typeof data?.error === "string" && data.error) message = data.error;
        } catch {
          // Non-JSON error body: keep the status message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filenameFromResponse(response, href);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : "Could not export report";
      console.error("Marketplace export failed:", e);
      toast.error(message, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportButton
      size="sm"
      loading={loading}
      onClick={handleClick}
      className="gap-2"
    >
      Export Excel
    </ExportButton>
  );
}
