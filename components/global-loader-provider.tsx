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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startedAtRef = useRef<number | null>(null);
  const shownForUrlRef = useRef<string>("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, remaining);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    };
  }, [currentUrl, isLoading]);

  const showLoader = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    startedAtRef.current = Date.now();
    shownForUrlRef.current = currentUrl;
    setIsLoading(true);
  };
  
  const hideLoader = () => {
    const startedAt = startedAtRef.current ?? Date.now();
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minDurationMs - elapsed);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  };

  return (
    <GlobalLoaderContext.Provider value={{ isLoading, setIsLoading, showLoader, hideLoader }}>
      {children}
      {isLoading && <AppLogoLoader label={null} />}
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
