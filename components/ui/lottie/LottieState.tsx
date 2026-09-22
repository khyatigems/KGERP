"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "./LottieAnimation";
import { getAnimationConfig, StateVariant, stateVariantMap, prefersReducedMotion } from "./animations";

interface LottieStateProps {
  variant: StateVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}

const sizeClasses = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
  xl: "w-64 h-64",
};

const inlineSizeClasses = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const defaultTitles: Record<StateVariant, string> = {
  empty: "No data available",
  error: "Something went wrong",
  noData: "No results found",
};

const defaultDescriptions: Record<StateVariant, string> = {
  empty: "There's nothing here yet. Get started by adding your first item.",
  error: "We encountered an issue. Please try again or contact support.",
  noData: "Try adjusting your search or filter criteria.",
};

export function LottieState({
  variant,
  title,
  description,
  action,
  className,
  style,
  size = "md",
  animated = true,
}: LottieStateProps) {
  const animationKey = stateVariantMap[variant];
  const config = getAnimationConfig(animationKey);
  const reducedMotion = prefersReducedMotion();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4 p-6 rounded-xl border border-border bg-card",
        sizeClasses[size],
        className
      )}
      style={style}
      role="status"
      aria-live="polite"
    >
      {animated && !reducedMotion ? (
        <div className="relative flex-shrink-0" style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" }}>
          <LottieAnimation config={config} className="w-full h-full" />
        </div>
      ) : (
        <div className={cn("flex items-center justify-center text-muted-foreground", sizeClasses[size])} aria-hidden="true">
          {variant === "empty" && (
            <svg className="w-full h-full opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M9 9h6M9 15h4" />
            </svg>
          )}
          {variant === "error" && (
            <svg className="w-full h-full opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {variant === "noData" && (
            <svg className="w-full h-full opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 w-full max-w-xs">
        <h3 className="text-sm md:text-base font-semibold text-foreground">
          {title || defaultTitles[variant]}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          {description || defaultDescriptions[variant]}
        </p>
        {action && (
          <div className="mt-2">{action}</div>
        )}
      </div>
    </div>
  );
}

export function EmptyState(props: Omit<LottieStateProps, "variant">) {
  return <LottieState variant="empty" {...props} />;
}

export function ErrorState(props: Omit<LottieStateProps, "variant">) {
  return <LottieState variant="error" {...props} />;
}

export function NoDataState(props: Omit<LottieStateProps, "variant">) {
  return <LottieState variant="noData" {...props} />;
}

export function InlineLottieState({
  variant,
  className,
  style,
  title,
  description,
  size = "sm",
}: Pick<LottieStateProps, "variant" | "className" | "style" | "title" | "description"> & { size?: "sm" | "md" | "lg" | "xl" }) {
  const animationKey = stateVariantMap[variant];
  const config = getAnimationConfig(animationKey);
  const reducedMotion = prefersReducedMotion();

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/30", className)} style={style} role="status">
      <div className={cn("flex-shrink-0", inlineSizeClasses[size])}>
        {!reducedMotion ? (
          <LottieAnimation config={config} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50" aria-hidden="true">
            {variant === "empty" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 15h4" /></svg>}
            {variant === "error" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
            {variant === "noData" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title || defaultTitles[variant]}</p>
        <p className="text-xs text-muted-foreground truncate">{description || defaultDescriptions[variant]}</p>
      </div>
    </div>
  );
}