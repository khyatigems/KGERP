"use client";

import { cn } from "@/lib/utils";

interface TopLoaderProps {
  progress?: number | null;
  isLoading?: boolean;
}

export function TopLoader({ progress = null, isLoading = false }: TopLoaderProps) {
  if (!isLoading) return null;

  const hasProgress = typeof progress === "number" && progress >= 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[3px] pointer-events-none">
      {hasProgress ? (
        <div className="relative h-full">
          {/* Track background */}
          <div className="absolute inset-0 bg-white/[0.03]" />
          {/* Progress fill */}
          <div
            className="h-full rounded-r-sm transition-all duration-300 ease-out relative"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          >
            {/* Main gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary to-primary rounded-r-sm" />
            {/* Glow effect */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-6 bg-primary/50 blur-lg rounded-full" />
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer rounded-r-sm" />
          </div>
        </div>
      ) : (
        <div className="relative h-full">
          <div
            className={cn(
              "h-full w-full bg-gradient-to-r from-primary/80 via-primary to-primary/80",
              "animate-progress-indeterminate"
            )}
          />
          {/* Glow trail */}
          <div className="absolute top-1/2 -translate-y-1/2 w-12 h-4 bg-primary/40 blur-xl rounded-full animate-progress-indeterminate" />
        </div>
      )}
    </div>
  );
}
