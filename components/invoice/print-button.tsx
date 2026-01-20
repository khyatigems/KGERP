"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      className="inline-flex items-center"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print
    </Button>
  );
}
