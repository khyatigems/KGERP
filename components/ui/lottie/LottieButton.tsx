"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "./LottieAnimation";
import { getAnimationConfig, ActionVariant, actionVariantMap, prefersReducedMotion } from "./animations";
import { Loader2, Check, X, RefreshCw, Filter, Upload } from "lucide-react";

interface LottieButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  iconOnly?: boolean;
  iconPosition?: "left" | "right";
  animationSize?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  onSuccess?: () => void;
  onError?: () => void;
  disableAnimation?: boolean;
}

const variantIconMap: Record<ActionVariant, React.ReactNode> = {
  export: <Download className="h-4 w-4" />,
  save: <Save className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  filter: <Filter className="h-4 w-4" />,
  sync: <RefreshCw className="h-4 w-4" />,
};

const defaultIcons: Record<string, React.ReactNode> = {
  Download: <Download className="h-4 w-4" />,
  Save: <Save className="h-4 w-4" />,
  Trash2: <Trash2 className="h-4 w-4" />,
  Filter: <Filter className="h-4 w-4" />,
  RefreshCw: <RefreshCw className="h-4 w-4" />,
  Upload: <Upload className="h-4 w-4" />,
};

function Download({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function Save({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function Trash2({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function LottieButton({
  variant = "save",
  children,
  loading = false,
  success = false,
  error = false,
  iconOnly = false,
  iconPosition = "left",
  animationSize = 20,
  className,
  disabled,
  onClick,
  onSuccess,
  onError,
  disableAnimation = false,
  ...props
}: LottieButtonProps) {
  const [animationState, setAnimationState] = useState<"idle" | "progress" | "success" | "error">("idle");
  const playerRef = useRef<any>(null);
  const reducedMotion = prefersReducedMotion();
  const animationKey = actionVariantMap[variant];
  const config = getAnimationConfig(animationKey);

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    if (!disableAnimation && !reducedMotion) {
      setAnimationState("progress");
      onClick?.(e);
    } else {
      onClick?.(e);
    }
  }, [disabled, loading, disableAnimation, reducedMotion, onClick]);

  const handleAnimationComplete = useCallback(() => {
    if (animationState === "progress") {
      setAnimationState("success");
      onSuccess?.();
      setTimeout(() => setAnimationState("idle"), 1500);
    } else if (animationState === "error") {
      onError?.();
      setTimeout(() => setAnimationState("idle"), 1500);
    }
  }, [animationState, onSuccess, onError]);

  const handleAnimationError = useCallback(() => {
    setAnimationState("error");
  }, []);

  React.useEffect(() => {
    if (loading) {
      setAnimationState("progress");
    } else if (success) {
      setAnimationState("success");
      onSuccess?.();
      setTimeout(() => setAnimationState("idle"), 1500);
    } else if (error) {
      setAnimationState("error");
      onError?.();
      setTimeout(() => setAnimationState("idle"), 1500);
    } else if (animationState === "success" || animationState === "error") {
      // Keep success/error state for a bit
    } else {
      setAnimationState("idle");
    }
  }, [loading, success, error, onSuccess, onError]);

  const isAnimating = animationState !== "idle";
  const showSuccess = animationState === "success";
  const showError = animationState === "error";
  const showProgress = animationState === "progress";

  const buttonContent = (
    <>
      {(!iconOnly || iconPosition === "left") && (
        <span className={cn("flex items-center justify-center transition-opacity duration-200", showSuccess || showError ? "opacity-0" : "opacity-100")}>
          {showProgress ? (
            <LottieAnimation
              config={{ ...config, loop: true, autoplay: true, segments: [0, 50] }}
              className={cn("w-[20px] h-[20px]", `w-[${animationSize}px] h-[${animationSize}px]`)}
              onComplete={handleAnimationComplete}
              onError={handleAnimationError}
            />
          ) : showSuccess ? (
            <LottieAnimation
              config={{ ...config, loop: false, autoplay: true }}
              className={cn("w-[20px] h-[20px]", `w-[${animationSize}px] h-[${animationSize}px]`)}
              onComplete={handleAnimationComplete}
            />
          ) : showError ? (
            <X className={cn("h-4 w-4 text-destructive", `h-[${animationSize}px] w-[${animationSize}px]`)} />
          ) : (
            variantIconMap[variant]
          )}
        </span>
      )}
      {!iconOnly && (
        <span className={cn("flex-1 text-center transition-opacity duration-200", showSuccess || showError ? "opacity-0" : "opacity-100")}>
          {children}
        </span>
      )}
      {(!iconOnly || iconPosition === "right") && showSuccess && (
        <span className="flex items-center justify-center text-emerald-500">
          <Check className={cn("h-4 w-4", `h-[${animationSize}px] w-[${animationSize}px]`)} />
        </span>
      )}
      {(!iconOnly || iconPosition === "right") && showError && (
        <span className="flex items-center justify-center text-destructive">
          <X className={cn("h-4 w-4", `h-[${animationSize}px] w-[${animationSize}px]`)} />
        </span>
      )}
    </>
  );

  return (
    <button
      type="button"
      disabled={disabled || loading || isAnimating}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:opacity-90 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {buttonContent}
    </button>
  );
}

export function ExportButton(props: Omit<LottieButtonProps, "variant">) {
  return <LottieButton variant="export" {...props} />;
}

export function SaveButton(props: Omit<LottieButtonProps, "variant">) {
  return <LottieButton variant="save" {...props} />;
}

export function DeleteButton(props: Omit<LottieButtonProps, "variant">) {
  return <LottieButton variant="delete" {...props} />;
}

export function FilterButton(props: Omit<LottieButtonProps, "variant">) {
  return <LottieButton variant="filter" {...props} />;
}

export function SyncButton(props: Omit<LottieButtonProps, "variant">) {
  return <LottieButton variant="sync" {...props} />;
}