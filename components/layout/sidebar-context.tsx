"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "khyatigems-sidebar-collapsed";

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Keep the server render and the client's hydration render structurally
  // identical. Reading localStorage during the first render can change the
  // sidebar tree before Radix components hydrate, producing mismatched useId
  // values for their aria-controls/id attributes.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1"); } catch {}

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setCollapsed(event.key === null ? false : event.newValue === "1");
      }
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const setCollapsedPersist = useCallback((value: boolean) => {
    setCollapsed(value);
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch {}
  }, []);
  const toggleCollapsed = useCallback(() => setCollapsedPersist(!collapsed), [collapsed, setCollapsedPersist]);
  const contextValue = useMemo(
    () => ({ collapsed, setCollapsed: setCollapsedPersist, toggleCollapsed }),
    [collapsed, setCollapsedPersist, toggleCollapsed],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
