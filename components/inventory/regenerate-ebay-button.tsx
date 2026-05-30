"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { RegenerateEbayModal } from "./regenerate-ebay-modal";

interface RegenerateEbayButtonProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function RegenerateEbayButton({
  label = "Regenerate eBay Descriptions",
  variant = "outline",
  size = "sm",
  className,
}: RegenerateEbayButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setModalOpen(true)}
        className={className}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <RegenerateEbayModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
