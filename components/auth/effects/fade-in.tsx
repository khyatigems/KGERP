"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
}

export function FadeIn({ children, delay = 0, className, direction = "up", duration = 600 }: FadeInProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const transform =
    direction === "up" ? "translateY(12px)" :
    direction === "down" ? "translateY(-12px)" :
    direction === "left" ? "translateX(12px)" :
    direction === "right" ? "translateX(-12px)" :
    "none";

  return (
    <div
      className={cn("transition-all ease-out", className)}
      style={{
        transitionDuration: `${duration}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0,0)" : transform,
      }}
    >
      {children}
    </div>
  );
}
