"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type LogoVariant = "auto" | "light" | "dark";

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
}

/**
 * KhyatiGems brand logo.
 * - variant="dark"  → white shapes (for dark backgrounds)
 * - variant="light" → brand navy/red shapes (for light backgrounds)
 * - variant="auto"  → resolved automatically from the active theme
 */
export function Logo({ className, variant = "auto" }: LogoProps) {
  const { resolvedTheme } = useTheme();

  const resolved = variant === "auto" ? (resolvedTheme === "dark" ? "dark" : "light") : variant;
  const isDark = resolved === "dark";

  const navy = isDark ? "#FFFFFF" : "#181547";
  const red = isDark ? "#FFFFFF" : "#D03837";

  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 1000 1000"
      xmlSpace="preserve"
      className={cn("w-full h-full drop-shadow-2xl", className)}
      style={{ color: isDark ? "#FFFFFF" : "#181547" }}
    >
      <style type="text/css">
        {`
          .st2{fill:${navy};}
          .st-facet{fill:${red};}
        `}
      </style>
      <g>
        <g>
          <polygon className="st2" points="391.3,256.3 300.9,375.7 420.8,256.3" />
          <polygon className="st2" points="465.1,256.3 374.7,375.7 494.6,256.3" />
          <polygon className="st-facet" points="608.7,256.3 699.1,375.7 579.2,256.3" />
          <polygon className="st-facet" points="534.9,256.3 625.3,375.7 505.4,256.3" />
        </g>
        <polygon
          className="st2"
          points="641.4,256.3 793.5,375.7 872,375.7 658.2,207.8 342.1,207.8 176.5,337.9 176.5,207.8 176,207.8 128,245.4 128,738.2 176.3,792.2 176.5,792.2 176.5,430.2 500.1,792.2 745.1,518.2 788.5,469.7 723.4,469.7 453.9,469.7 497.3,518.2 680.1,518.2 500.1,719.4 320.2,518.2 276.8,469.7 198.6,382.2 358.8,256.3"
        />
      </g>
    </svg>
  );
}