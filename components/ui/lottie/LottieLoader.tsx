"use client";

import React, { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "./LottieAnimation";
import { animations, LoaderVariant, loaderVariantMap, getAnimationConfig } from "./animations";

interface LottieLoaderProps {
  variant?: LoaderVariant;
  className?: string;
  style?: React.CSSProperties;
  fullscreen?: boolean;
  label?: string | null;
  progress?: number | null;
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
}

const variantLabelMap: Record<LoaderVariant, string> = {
  global: "Loading application...",
  dashboard: "Loading dashboard...",
  widget: "Loading...",
  export: "Exporting...",
};

export function LottieLoader({
  variant = "global",
  className,
  style,
  fullscreen = true,
  label,
  progress = null,
  overlayClassName,
  overlayStyle,
}: LottieLoaderProps) {
  const animationKey = loaderVariantMap[variant];
  const config = getAnimationConfig(animationKey);
  const displayLabel = label ?? variantLabelMap[variant];
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : null;

  const segments = useMemo(() => {
    if (pct === null) return config.segments;
    const totalFrames = 100;
    const endFrame = Math.round((pct / 100) * totalFrames);
    return [0, endFrame] as [number, number];
  }, [config.segments, pct]);

  const mergedConfig = useMemo(() => ({
    ...config,
    segments,
    loop: pct === null ? config.loop : false,
    autoplay: true,
  }), [config, segments, pct]);

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="relative w-24 h-24 md:w-32 md:h-32" style={{ flexShrink: 0 }}>
        <LottieAnimation config={mergedConfig} className="w-full h-full" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
          KhyatiGems<span className="text-primary">™</span>
        </h2>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
          Enterprise ERP
        </p>

        {pct !== null && (
          <div className="w-56 md:w-72 flex flex-col items-center gap-2 mt-2">
            <div className="relative w-full h-[4px] rounded-full bg-white/[0.06] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
              <div
                className="h-full rounded-full transition-all duration-[300ms] ease-out relative"
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary/40 blur-lg rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-primary">{Math.round(pct)}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Loading</span>
            </div>
          </div>
        )}

        {displayLabel && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
            <p className="text-sm text-muted-foreground font-medium tracking-wide">{displayLabel}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-fade-in-loader",
          overlayClassName
        )}
        style={overlayStyle}
        role="status"
        aria-live="polite"
        aria-label={displayLabel}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/[0.03] blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/[0.02] blur-[100px] rounded-full" />
        </div>
        <div className="relative z-10">{content}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)} style={style} role="status" aria-live="polite" aria-label={displayLabel}>
      {content}
    </div>
  );
}

export function InlineLottieLoader({
  variant = "widget",
  className,
  style,
  label,
  progress = null,
}: Omit<LottieLoaderProps, "fullscreen" | "overlayClassName" | "overlayStyle">) {
  return <LottieLoader variant={variant} className={className} style={style} label={label} progress={progress} fullscreen={false} />;
}