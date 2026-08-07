"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

export function SidebarGridClient({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        "grid min-h-screen w-full transition-all duration-300",
        "lg:grid-cols-[var(--sidebar-w,250px)_1fr]"
      )}
      style={
        {
          "--sidebar-w": collapsed ? "64px" : "250px",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}