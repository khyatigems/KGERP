"use client";

import React, { createContext, useContext, useState, useEffect, Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppLogoLoader } from "@/components/ui/app-logo-loader";

interface GlobalLoaderContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showLoader: () => void;
  hideLoader: () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextType | undefined>(undefined);

function GlobalLoaderContent({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startedAtRef = useRef<number | null>(null);
  const shownForUrlRef = useRef<string>("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldCompleteRef = useRef(false);
  const minDurationMs = 1500;

  const currentUrl = (() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  })();

  useEffect(() => {
    if (!isLoading) return;
    if (currentUrl === shownForUrlRef.current) return;

    const startedAt = startedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minDurationMs - elapsed);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    shouldCompleteRef.current = true;
    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, remaining);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    };
  }, [currentUrl, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      return;
    }
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        if (shouldCompleteRef.current) return 100;
        if (p >= 90) return p;
        const next = p + Math.max(1, Math.round((90 - p) * 0.08));
        return Math.min(90, next);
      });
    }, 180);
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    };
  }, [isLoading]);

  const showLoader = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    startedAtRef.current = Date.now();
    shownForUrlRef.current = currentUrl;
    shouldCompleteRef.current = false;
    setProgress(0);
    setIsLoading(true);
  };
  
  const hideLoader = () => {
    const startedAt = startedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minDurationMs - elapsed);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  };

  return (
    <GlobalLoaderContext.Provider value={{ isLoading, setIsLoading, showLoader, hideLoader }}>
      {children}
      {isLoading && <AppLogoLoader label={null} progress={progress} />}
    </GlobalLoaderContext.Provider>
  );
}

// Wrap in Suspense because useSearchParams causes client-side deopt if not suspended
export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GlobalLoaderContent>{children}</GlobalLoaderContent>
    </Suspense>
  );
}

export function useGlobalLoader() {
  const context = useContext(GlobalLoaderContext);
  if (context === undefined) {
    throw new Error("useGlobalLoader must be used within a GlobalLoaderProvider");
  }
  return context;
}
