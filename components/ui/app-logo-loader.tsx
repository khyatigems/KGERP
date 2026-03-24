"use client";

import { cn } from "@/lib/utils";
import { Logo } from "./logo";

interface AppLogoLoaderProps {
  className?: string;
  fullscreen?: boolean;
  label?: string | null;
  progress?: number | null;
}

export function AppLogoLoader({ className, fullscreen = true, label, progress = null }: AppLogoLoaderProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="relative w-32 h-32">
        {/* Glow effect behind logo */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        
        <Logo className="animate-logo-pulse" />
      </div>
      {typeof progress === "number" && (
        <div className="w-72 max-w-[80vw] flex flex-col items-center gap-2">
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-blue-500 to-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium tabular-nums">
            {Math.round(progress)}% loading
          </div>
        </div>
      )}
      {label && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground text-lg font-medium animate-pulse tracking-wide">
            {label}
          </p>
          <div className="h-1 w-24 bg-muted overflow-hidden rounded-full">
            <div className="h-full bg-primary w-1/2 animate-shimmer" 
                 style={{ 
                   backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                   transform: 'translateX(-100%)' 
                 }} 
            />
          </div>
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-md transition-all duration-500 animate-in fade-in">
        {content}
      </div>
    );
  }

  return content;
}
