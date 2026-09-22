"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "./LottieAnimation";
import { animations, getAnimationConfig, shouldRenderAnimation, prefersReducedMotion } from "./animations";
import type { AnimationKey, AnimationConfig } from "./animations";

type TriggerType = "hover" | "click" | "auto" | "mount";

interface LottieIconProps {
  src: AnimationKey | string;
  trigger?: TriggerType;
  className?: string;
  style?: React.CSSProperties;
  size?: number | string;
  fallbackIcon?: React.ReactNode;
  onAnimationComplete?: () => void;
  loop?: boolean;
  speed?: number;
  segments?: [number, number];
  premiumOnly?: boolean;
  "data-testid"?: string;
}

export function LottieIcon({
  src,
  trigger = "hover",
  className,
  style,
  size = 24,
  fallbackIcon,
  onAnimationComplete,
  loop = false,
  speed = 1,
  segments,
  premiumOnly = false,
  "data-testid": testId,
}: LottieIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const reducedMotion = prefersReducedMotion();

  const config = typeof src === "string" && src in animations
    ? getAnimationConfig(src as AnimationKey)
    : { src, loop, autoplay: false, premiumOnly, segments, speed };

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const playAnimation = () => {
    if (playerRef.current && !reducedMotion) {
      playerRef.current.play?.();
      setIsPlaying(true);
    }
  };

  const resetAnimation = () => {
    if (playerRef.current) {
      playerRef.current.goToAndStop?.(0, true);
      setIsPlaying(false);
    }
  };

  const handleLoad = (player: any) => {
    playerRef.current = player;
    if (trigger === "mount" || trigger === "auto") {
      playAnimation();
    }
  };

  const handleComplete = () => {
    if (!loop) setIsPlaying(false);
    onAnimationComplete?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  const shouldRender = shouldRenderAnimation(config) && !hasError && isMounted;

  const handleMouseEnter = () => {
    if (trigger === "hover") playAnimation();
  };

  const handleMouseLeave = () => {
    if (trigger === "hover" && !loop) resetAnimation();
  };

  const handleClick = () => {
    if (trigger === "click") {
      resetAnimation();
      playAnimation();
    }
  };

  const sizeStyle = {
    width: typeof size === "number" ? `${size}px` : size,
    height: typeof size === "number" ? `${size}px` : size,
    flexShrink: 0,
    ...style,
  };

  if (!shouldRender || reducedMotion) {
    return (
      <div
        ref={containerRef}
        className={cn("inline-flex items-center justify-center", className)}
        style={sizeStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-testid={testId}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("inline-flex items-center justify-center relative", className)}
      style={sizeStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-testid={testId}
    >
      <LottieAnimation
        config={config}
        className="w-full h-full"
        onLoad={handleLoad}
        onError={handleError}
        onComplete={handleComplete}
      />
      {fallbackIcon && (
        <div className="absolute inset-0 opacity-0 pointer-events-none" aria-hidden="true">
          {fallbackIcon}
        </div>
      )}
    </div>
  );
}

export function NavItemIcon({
  icon: FallbackIcon,
  isActive,
  isHovered,
  className,
  lottieSrc,
  ...props
}: {
  icon: React.ReactNode;
  isActive?: boolean;
  isHovered?: boolean;
  className?: string;
  lottieSrc?: string;
} & Omit<LottieIconProps, "src" | "trigger" | "fallbackIcon">) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Always show the fallback icon (Lucide icon) */}
      <div className="transition-opacity duration-200">
        {FallbackIcon}
      </div>
      {/* Show per-item Lottie hover animation when hovered */}
      {isHovered && lottieSrc && (
        <LottieIcon
          src={lottieSrc}
          trigger="mount"
          loop={false}
          premiumOnly={false}
          className="absolute inset-0 transition-opacity duration-200"
          {...props}
        />
      )}
      {/* Fallback to generic hover animation if no per-item Lottie */}
      {isHovered && !lottieSrc && (
        <LottieIcon
          src="navItemHover"
          trigger="mount"
          loop={false}
          premiumOnly={false}
          className="absolute inset-0 transition-opacity duration-200"
          {...props}
        />
      )}
      {isActive && (
        <LottieIcon
          src="gemSparkle"
          trigger="auto"
          loop={true}
          speed={0.8}
          premiumOnly={false}
          className="absolute -inset-1 opacity-60"
          {...props}
        />
      )}
    </div>
  );
}

export function SidebarChevronIcon({
  collapsed,
  className,
  ...props
}: {
  collapsed: boolean;
  className?: string;
} & Omit<LottieIconProps, "src" | "trigger" | "fallbackIcon">) {
  return (
    <LottieIcon
      src={collapsed ? "sidebarExpand" : "sidebarCollapse"}
      trigger="mount"
      loop={false}
      className={cn("transition-transform duration-300", className)}
      fallbackIcon={<span className="text-muted-foreground">›</span>}
      {...props}
    />
  );
}