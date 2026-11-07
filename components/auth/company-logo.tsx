"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  className?: string;
  variant?: "light" | "dark" | "gold" | "white";
  size?: "sm" | "md" | "lg";
  logoUrl?: string | null;
  companyName?: string;
}

const sizeMap = {
  sm: { box: "h-8 w-8", text: "text-sm", radius: "rounded-lg" },
  md: { box: "h-10 w-10", text: "text-lg", radius: "rounded-xl" },
  lg: { box: "h-14 w-14", text: "text-2xl", radius: "rounded-xl" },
};

export function CompanyLogo({
  className,
  variant = "light",
  size = "md",
  logoUrl,
  companyName = "Khyati Gems",
}: CompanyLogoProps) {
  const s = sizeMap[size];
  const [imgFailed, setImgFailed] = useState(false);

  if (logoUrl && !imgFailed) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <img
          src={logoUrl}
          alt={companyName}
          onError={() => setImgFailed(true)}
          className={cn(
            s.box,
            s.radius,
            "object-contain shrink-0"
          )}
        />
        <span
          className={cn(
            "font-medium",
            s.text,
            variant === "dark" ? "text-white" : variant === "gold" ? "text-[#C9A86A]" : variant === "white" ? "text-white" : "text-slate-900 dark:text-white"
          )}
        >
          {companyName}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          s.box,
          s.radius,
          "flex items-center justify-center",
          variant === "white" || variant === "dark" ? "bg-white/10 text-white" : "bg-muted text-foreground"
        )}
      >
        <span className={cn("font-medium", s.text)}>
          {companyName.charAt(0).toUpperCase()}
        </span>
      </div>
      <span
        className={cn(
          "font-medium",
          s.text,
          variant === "dark" ? "text-white" : variant === "gold" ? "text-[#C9A86A]" : variant === "white" ? "text-white" : "text-slate-900 dark:text-white"
        )}
      >
        {companyName}
      </span>
    </div>
  );
}
