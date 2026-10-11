"use client";
interface TopLoaderProps { progress?: number | null; isLoading?: boolean; }
export function TopLoader({ progress = null, isLoading = false }: TopLoaderProps) {
  if (!isLoading) return null;
  const hasProgress = typeof progress === "number" && progress >= 0;
  return <div className="pointer-events-none fixed inset-x-0 top-0 z-[9998] h-[3px] overflow-hidden bg-primary/10" aria-hidden="true"><div className={`h-full bg-primary ${hasProgress ? "transition-[width] duration-200" : "w-full animate-progress-indeterminate"}`} style={hasProgress ? { width: `${Math.min(100, Math.max(0, progress))}%` } : undefined}/></div>;
}
