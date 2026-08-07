"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGemProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

/**
 * Premium animated gem SVG using SMIL animations (facet shimmer + sparkle
 * twinkle). Automatically disables motion for users with reduced-motion
 * preferences.
 */
export function AnimatedGem({ className, size = 24, animate = true }: AnimatedGemProps) {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const on = animate && !reduced;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="agem-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Gem body */}
      <path
        d="M24 4 L40 18 L24 44 L8 18 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="url(#agem-fill)"
      />
      {/* Table facet */}
      <path d="M24 4 L31 11 L24 17 L17 11 Z" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.7" fill="none" />
      {/* Crown facets */}
      <path d="M8 18 L17 11 L24 17" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" fill="none" />
      <path d="M40 18 L31 11 L24 17" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" fill="none" />
      {/* Girdle */}
      <path d="M8 18 L40 18" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.8" />
      {/* Pavilion facets */}
      <path d="M24 17 L14 26 L24 44" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.45" fill="none" />
      <path d="M24 17 L34 26 L24 44" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.45" fill="none" />

      {/* Rotating sparkle ring around the girdle */}
      <circle cx="24" cy="18" r="19" fill="none" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.25">
        {on && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 24 18"
            to="360 24 18"
            dur="9s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Twinkling sparkles */}
      <path d="M4 8 L5.4 11 L4 14 L2.6 11 Z" fill="currentColor" fillOpacity="0.9">
        {on && (
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.6s"
            begin="0s"
            repeatCount="indefinite"
          />
        )}
      </path>
      <path d="M43 32 L44.3 34.8 L43 37.6 L41.7 34.8 Z" fill="currentColor" fillOpacity="0.9">
        {on && (
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="3.1s"
            begin="0.8s"
            repeatCount="indefinite"
          />
        )}
      </path>
      <path d="M45 7 L46.2 9.5 L45 12 L43.8 9.5 Z" fill="currentColor" fillOpacity="0.9">
        {on && (
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.3s"
            begin="1.4s"
            repeatCount="indefinite"
          />
        )}
      </path>
      <path d="M2 30 L3.2 32.5 L2 35 L0.8 32.5 Z" fill="currentColor" fillOpacity="0.9">
        {on && (
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="3.4s"
            begin="0.5s"
            repeatCount="indefinite"
          />
        )}
      </path>
    </svg>
  );
}
