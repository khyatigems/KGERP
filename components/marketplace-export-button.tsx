"use client";

import { ExportButton } from "@/components/ui/lottie";

export function MarketplaceExportButton({ href }: { href: string }) {
  const handleClick = () => {
    const a = document.createElement("a");
    a.href = href;
    a.download = "";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ExportButton
      size="sm"
      onClick={handleClick}
      className="gap-2"
    >
      Export Excel
    </ExportButton>
  );
}
