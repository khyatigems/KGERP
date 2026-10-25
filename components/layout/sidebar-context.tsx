"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SIDEBAR_COLLAPSED_COOKIE, SIDEBAR_COLLAPSED_STORAGE_KEY } from "@/lib/sidebar-preferences";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function persistCollapsedCookie(value: boolean) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${value ? "1" : "0"}; Path=/; SameSite=Lax; Max-Age=31536000${secure}`;
}

export function SidebarProvider({ children, initialCollapsed = false }: { children: ReactNode; initialCollapsed?: boolean }) {
  // The server reads this preference from a cookie so its first render and
  // React's hydration render use the same sidebar tree and Radix IDs.
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY || event.key === null) {
        const next = event.key === null ? false : event.newValue === "1";
        setCollapsed(next);
        persistCollapsedCookie(next);
      }
    };
    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const setCollapsedPersist = useCallback((value: boolean) => {
    setCollapsed(value);
    try { window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "1" : "0"); } catch {}
    persistCollapsedCookie(value);
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
