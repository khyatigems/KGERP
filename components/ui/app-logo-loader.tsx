"use client";

import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { AnimatedGem } from "./animated-gem";

interface AppLogoLoaderProps {
  className?: string;
  fullscreen?: boolean;
  label?: string | null;
  progress?: number | null;
}

export function AppLogoLoader({ className, fullscreen = true, label, progress = null }: AppLogoLoaderProps) {
  const pct = typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : null;

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-8", className)}>
      {/* Logo with multi-layer glow */}
      <div className="relative w-28 h-28 md:w-36 md:h-36">
        {/* Outer ambient glow */}
        <div className="absolute -inset-12 bg-primary/8 blur-[80px] rounded-full" />
        {/* Inner glow ring */}
        <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full animate-logo-pulse" />
        {/* Logo */}
        <div className="relative z-10 drop-shadow-[0_0_30px_rgba(34,197,94,0.25)]">
          <Logo className="w-full h-full" />
        </div>
        {/* Decorative sparkle gems */}
        <span className="absolute -top-2 -right-2 z-20 text-primary/90">
          <AnimatedGem size={18} />
        </span>
        <span className="absolute -bottom-3 -left-3 z-20 text-primary/70">
          <AnimatedGem size={14} animate={false} />
        </span>
      </div>

      {/* Brand text */}
      <div className="flex flex-col items-center gap-1.5">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          KhyatiGems<span className="text-primary">™</span>
        </h1>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
          Enterprise ERP
        </p>
      </div>

      {/* Premium Progress Bar */}
      {pct !== null && (
        <div className="w-64 md:w-80 flex flex-col items-center gap-3">
          {/* Progress track */}
          <div className="relative w-full h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
            {/* Animated background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
            {/* Progress fill */}
            <div
              className="h-full rounded-full transition-all duration-[400ms] ease-out relative"
              style={{ width: `${pct}%` }}
            >
              {/* Main gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full" />
              {/* Glow on leading edge */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary/40 blur-lg rounded-full" />
              {/* Shimmer on bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>
          {/* Percentage text */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tabular-nums text-primary">
              {Math.round(pct)}%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Loading
            </span>
          </div>
        </div>
      )}

      {/* Label text with subtle animation */}
      {label && (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">
            {label}
          </p>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-fade-in-loader animate-in fade-in">
        {/* Subtle ambient background gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/[0.03] blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/[0.02] blur-[100px] rounded-full" />
        </div>
        {/* Content */}
        <div className="relative z-10">{content}</div>
      </div>
    );
  }

  return content;
}
