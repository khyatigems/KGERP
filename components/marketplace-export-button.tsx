"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

export function MarketplaceExportButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    const a = document.createElement("a");
    a.href = href;
    a.download = "";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Reset after a delay to give the download time to start
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={handleClick}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      {loading ? "Exporting..." : "Export Excel"}
    </Button>
  );
}
