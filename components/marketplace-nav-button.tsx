"use client";

import Link from "next/link";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface MarketplaceNavButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function MarketplaceNavButton({ href, children, variant = "outline", size }: MarketplaceNavButtonProps) {
  const { showLoader } = useGlobalLoader();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    showLoader();
    setLoading(true);
  };

  return (
    <Link href={href} onClick={handleClick}>
      <Button variant={variant} size={size} disabled={loading} className="transition-all duration-200">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children}
      </Button>
    </Link>
  );
}
