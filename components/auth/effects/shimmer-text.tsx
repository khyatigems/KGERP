"use client";

import { cn } from "@/lib/utils";

export function ShimmerText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block bg-gradient-to-r from-blue-400 via-indigo-300 to-blue-400 bg-[length:200%_100%] bg-clip-text text-transparent",
        className
      )}
      style={{ animation: "gem-shimmer 3s linear infinite" }}
    >
      {children}
    </span>
  );
}
