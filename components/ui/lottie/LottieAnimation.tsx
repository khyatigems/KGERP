"use client";

import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { AnimationConfig, prefersReducedMotion, shouldRenderAnimation } from "./animations";
import type { AnimationItem } from "lottie-web";
import { useThemeHue } from "./useThemeHue";

interface LottieAnimationProps {
  config: AnimationConfig;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (player: AnimationItem) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onLoopComplete?: () => void;
  fallback?: React.ReactNode;
  "data-testid"?: string;
}

const Player = lazy(() => import("@lottiefiles/react-lottie-player").then(m => ({ default: m.Player })));

function LottieAnimationInner({
  config,
  className,
  style,
  onLoad,
  onError,
  onComplete,
  onLoopComplete,
  fallback,
  "data-testid": testId,
}: LottieAnimationProps) {
  const playerRef = useRef<AnimationItem | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reducedMotion = prefersReducedMotion();
  const hueRotation = useThemeHue();

  const playerStyle = {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    filter: `hue-rotate(${hueRotation}deg)`,
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setHasError(true);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [mounted]);

  const handleEvent = (event: string) => {
    if (event === "ready") {
      setIsLoaded(true);
    } else if (event === "error") {
      setHasError(true);
      onError?.(new Error("Lottie animation failed to load"));
    } else if (event === "complete") {
      onComplete?.();
    } else if (event === "loopComplete") {
      onLoopComplete?.();
    }
  };

  if (!mounted) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={style}
        data-testid={testId}
        role="status"
        aria-label="Loading"
      >
        {fallback || (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  if (!shouldRenderAnimation(config) || hasError) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={style}
        data-testid={testId}
        role="status"
        aria-label="Loading"
      >
        {fallback || (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={style}
        data-testid={testId}
        role="status"
        aria-label="Loading"
      >
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
          <div style={playerStyle}>
            <Player
              src={config.src}
              style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", ...style }}
              background="transparent"
              speed={0}
              loop={false}
              autoplay={false}
              renderer="svg"
              onEvent={(e) => { if (e === "ready") setIsLoaded(true); }}
            />
          </div>
        </Suspense>
      </div>
    );
  }

  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
      <div style={playerStyle} className={cn(className)}>
        <Player
          src={config.src}
          background="transparent"
          speed={config.speed ?? 1}
          loop={config.loop ?? false}
          autoplay={config.autoplay ?? true}
          renderer="svg"
          style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", ...style }}
          onEvent={(event: string) => {
            handleEvent(event);
            // Handle segments by calling playSegments on the instance
            if (config.segments && event === "ready") {
              const player = playerRef.current;
              if (player) {
                player.playSegments(config.segments, true);
              }
            }
          }}
          data-testid={testId}
        />
      </div>
    </Suspense>
  );
}

export function LottieAnimation(props: LottieAnimationProps) {
  const { fallback, ...rest } = props;

  return (
    <Suspense fallback={fallback || <Loader2 className="h-8 w-8 animate-spin text-primary" />}>
      <LottieAnimationInner {...rest} fallback={fallback} />
    </Suspense>
  );
}

export function LottieAnimationWithFallback({
  config,
  fallback: FallbackComponent,
  ...props
}: LottieAnimationProps & { fallback?: React.ComponentType<{ className?: string }> }) {
  const [showFallback, setShowFallback] = useState(false);

  return (
    <Suspense fallback={FallbackComponent ? <FallbackComponent /> : <Loader2 className="h-8 w-8 animate-spin text-primary" />}>
      <LottieAnimationInner
        {...props}
        config={config}
        onError={() => setShowFallback(true)}
        fallback={showFallback && FallbackComponent ? <FallbackComponent /> : undefined}
      />
    </Suspense>
  );
}