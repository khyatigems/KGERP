"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { RegenerateEbayModal } from "./regenerate-ebay-modal";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface RegenerateEbayButtonProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function RegenerateEbayButton({
  label,
  variant = "outline",
  size = "sm",
  className,
}: RegenerateEbayButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const useDefaultLabel = !label;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setModalOpen(true)}
        className={cn(
          "group min-h-10 gap-3 border-slate-300/80 bg-background/80 px-4 font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-background hover:shadow-md",
          className
        )}
      >
        <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-45" />
        {useDefaultLabel ? (
          <span className="inline-flex items-center gap-3">
            <Image
              src="/ebay-logo.svg"
              alt="eBay"
              width={92}
              height={36}
              className="h-7 w-24 object-contain"
            />
            <span>Descriptions</span>
          </span>
        ) : (
          label
        )}
      </Button>
      <RegenerateEbayModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
