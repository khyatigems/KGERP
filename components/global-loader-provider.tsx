"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from "react";
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
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  // When pathname changes, try to hide loader, but respect min duration
  useEffect(() => {
    // If we were loading, now we should try to hide
    if (isLoading) {
      const timer = setTimeout(() => {
        if (minTimePassed) {
          setIsLoading(false);
          setShouldHide(false);
        } else {
          setShouldHide(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams, isLoading, minTimePassed]);

  // Handle minimum duration logic
  useEffect(() => {
    if (isLoading) {
      const resetTimer = setTimeout(() => {
        setMinTimePassed(false);
        setShouldHide(false);
      }, 0);
      const timer = setTimeout(() => {
        setMinTimePassed(true);
      }, 1500); // Minimum 1.5s display time
      return () => {
        clearTimeout(resetTimer);
        clearTimeout(timer);
      };
    }
  }, [isLoading]);

  // Effect to close loader once min time passes if we are ready to hide
  useEffect(() => {
    if (minTimePassed && shouldHide) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        setShouldHide(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [minTimePassed, shouldHide]);

  const showLoader = () => {
    setIsLoading(true);
  };
  
  const hideLoader = () => {
     if (minTimePassed) {
       setIsLoading(false);
     } else {
       setShouldHide(true);
     }
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
