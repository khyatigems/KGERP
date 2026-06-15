"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CompanyLogoClientProps {
  className?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { box: "h-8 w-8", text: "text-sm", radius: "rounded-lg" },
  md: { box: "h-10 w-10", text: "text-lg", radius: "rounded-xl" },
  lg: { box: "h-14 w-14", text: "text-2xl", radius: "rounded-xl" },
};

export function CompanyLogoClient({
  className,
  variant = "light",
  size = "md",
}: CompanyLogoClientProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Khyati Gems");
  const s = sizeMap[size];

  useEffect(() => {
    fetch("/api/company/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setLogoUrl(data.logoUrl || null);
          setCompanyName(data.companyName || "Khyati Gems");
        }
      })
      .catch(() => {});
  }, []);

  if (logoUrl) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <img
          src={logoUrl}
          alt={companyName}
          className={cn(s.box, s.radius, "object-contain shrink-0 bg-white/10 p-1")}
        />
        <span
          className={cn(
            "font-semibold tracking-tight",
            s.text,
            variant === "dark" ? "text-white" : "text-slate-900 dark:text-white"
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
          "flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600",
          variant === "dark" ? "shadow-indigo-500/30" : "shadow-indigo-500/20"
        )}
      >
        <span className={cn("font-bold text-white", s.text)}>
          {companyName.charAt(0).toUpperCase()}
        </span>
      </div>
      <span
        className={cn(
          "font-semibold tracking-tight",
          s.text,
          variant === "dark" ? "text-white" : "text-slate-900 dark:text-white"
        )}
      >
        {companyName}
      </span>
    </div>
  );
}
