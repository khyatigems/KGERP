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
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-300 ease-out rounded-r-sm"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      ) : (
        <div
          className={cn(
            "h-full w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500",
            "animate-progress-indeterminate"
          )}
        />
      )}
    </div>
  );
}
