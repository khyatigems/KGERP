"use client";

import { cn } from "@/lib/utils";

export function AnimatedPage({
  children,
  className,
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  return (
    <div className={cn("sass-enter", stagger && "sass-stagger", className)}>
      {children}
    </div>
  );
}
