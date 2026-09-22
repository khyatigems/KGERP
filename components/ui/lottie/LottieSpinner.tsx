"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "./LottieAnimation";
import { getAnimationConfig, LoaderVariant, loaderVariantMap } from "./animations";
import { Loader2 } from "lucide-react";
import { prefersReducedMotion } from "./animations";

interface LottieSpinnerProps {
  variant?: LoaderVariant;
  className?: string;
  size?: number;
  showProgress?: boolean;
  progress?: number | null;
}

export function LottieSpinner({
  variant = "global",
  className,
  size = 24,
  showProgress = false,
  progress = null,
}: LottieSpinnerProps) {
  const animationKey = loaderVariantMap[variant];
  const config = getAnimationConfig(animationKey);
  const reducedMotion = prefersReducedMotion();

  const segments = React.useMemo(() => {
    if (progress === null) return config.segments;
    const totalFrames = 100;
    const endFrame = Math.round((progress / 100) * totalFrames);
    return [0, endFrame] as [number, number];
  }, [config.segments, progress]);

  const mergedConfig = React.useMemo(() => ({
    ...config,
    segments,
    loop: progress === null ? config.loop : false,
    autoplay: true,
  }), [config, segments, progress]);

  const sizeStyle = {
    width: size,
    height: size,
    flexShrink: 0,
  };

  if (reducedMotion) {
    return <Loader2 className={cn("animate-spin", className)} style={sizeStyle} aria-hidden="true" />;
  }

  return (
    <LottieAnimation
      config={mergedConfig}
      className={cn("w-full h-full", className)}
      style={sizeStyle}
      aria-hidden="true"
    />
  );
}

export function InlineLottieSpinner({
  className,
  size = 20,
  progress = null,
}: { className?: string; size?: number; progress?: number | null }) {
  return <LottieSpinner variant="widget" className={className} size={size} progress={progress} />;
}