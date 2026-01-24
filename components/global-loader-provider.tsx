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
       if (minTimePassed) {
         setIsLoading(false);
         setShouldHide(false);
       } else {
         setShouldHide(true);
       }
    }
  }, [pathname, searchParams]);

  // Handle minimum duration logic
  useEffect(() => {
    if (isLoading) {
      setMinTimePassed(false);
      setShouldHide(false);
      const timer = setTimeout(() => {
        setMinTimePassed(true);
      }, 1500); // Minimum 1.5s display time
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Effect to close loader once min time passes if we are ready to hide
  useEffect(() => {
    if (minTimePassed && shouldHide) {
      setIsLoading(false);
      setShouldHide(false);
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
      {isLoading && <AppLogoLoader label="Processing..." />}
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
