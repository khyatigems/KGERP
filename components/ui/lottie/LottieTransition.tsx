"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "./LottieAnimation";
import { getAnimationConfig, prefersReducedMotion } from "./animations";
import type { AnimationConfig } from "./animations";

interface LottieTransitionProps {
  children: React.ReactNode;
  enterAnimation?: AnimationConfig;
  exitAnimation?: AnimationConfig;
  enterKey?: string;
  exitKey?: string;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
  onEnterComplete?: () => void;
  onExitComplete?: () => void;
  mode?: "overlay" | "replace" | "crossfade";
}

interface TransitionState {
  status: "idle" | "entering" | "entered" | "exiting" | "exited";
  currentKey: string;
}

export function LottieTransition({
  children,
  enterAnimation,
  exitAnimation,
  enterKey,
  exitKey,
  className,
  style,
  delay = 0,
  duration = 300,
  onEnterComplete,
  onExitComplete,
  mode = "overlay",
}: LottieTransitionProps) {
  const [state, setState] = useState<TransitionState>({
    status: "idle",
    currentKey: enterKey || "default",
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayConfigRef = useRef<AnimationConfig | null>(null);
  const reducedMotion = prefersReducedMotion();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childrenKeyRef = useRef(enterKey || "default");

  useEffect(() => {
    if (childrenKeyRef.current !== (enterKey || "default")) {
      triggerExit(childrenKeyRef.current).then(() => {
        childrenKeyRef.current = enterKey || "default";
        triggerEnter(enterKey || "default");
      });
    }
  }, [enterKey, exitKey]);

  const triggerEnter = (key: string) => {
    return new Promise<void>((resolve) => {
      setState({ status: "entering", currentKey: key });
      if (enterAnimation && !reducedMotion) {
        overlayConfigRef.current = enterAnimation;
        setShowOverlay(true);
        timeoutRef.current = setTimeout(() => {
          setState({ status: "entered", currentKey: key });
          setShowOverlay(false);
          onEnterComplete?.();
          resolve();
        }, duration);
      } else {
        setState({ status: "entered", currentKey: key });
        onEnterComplete?.();
        resolve();
      }
    });
  };

  const triggerExit = (key: string) => {
    return new Promise<void>((resolve) => {
      setState({ status: "exiting", currentKey: key });
      if (exitAnimation && !reducedMotion) {
        overlayConfigRef.current = exitAnimation;
        setShowOverlay(true);
        timeoutRef.current = setTimeout(() => {
          setState({ status: "exited", currentKey: key });
          setShowOverlay(false);
          onExitComplete?.();
          resolve();
        }, duration);
      } else {
        setState({ status: "exited", currentKey: key });
        onExitComplete?.();
        resolve();
      }
    });
  };

  useEffect(() => {
    triggerEnter(enterKey || "default");
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const overlayContent = showOverlay && overlayConfigRef.current ? (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm",
        mode === "crossfade" && "opacity-50"
      )}
      style={{
        animation: `fade-in ${duration}ms ease-out`,
      }}
      aria-hidden="true"
    >
      <LottieAnimation config={overlayConfigRef.current} className="w-32 h-32" />
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)} style={style}>
      {overlayContent}
      <div
        className={cn(
          "transition-opacity duration-200",
          state.status === "entering" && "opacity-0",
          state.status === "entered" && "opacity-100 animate-enter",
          state.status === "exiting" && "opacity-0 animate-exit",
          mode === "crossfade" && "absolute inset-0"
        )}
        style={{
          opacity: state.status === "entering" ? 0 : state.status === "entered" ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function StaggeredLottieTransition({
  children,
  enterAnimation,
  exitAnimation,
  staggerDelay = 80,
  className,
  style,
  duration = 300,
  ...props
}: Omit<LottieTransitionProps, "delay"> & {
  staggerDelay?: number;
  children: React.ReactNode[];
}) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn(className)} style={style}>
      {childrenArray.map((child, index) => (
        <LottieTransition
          key={React.isValidElement(child) ? (child.key as string) || `child-${index}` : `child-${index}`}
          enterAnimation={enterAnimation}
          exitAnimation={exitAnimation}
          delay={index * staggerDelay}
          duration={duration}
          {...props}
        >
          {child}
        </LottieTransition>
      ))}
    </div>
  );
}

export function PageTransitionWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sass-enter", className)}>
      {children}
    </div>
  );
}