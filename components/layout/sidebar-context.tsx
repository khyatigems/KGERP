"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "khyatigems-sidebar-collapsed";

const listeners = new Set<() => void>();
let fallbackCollapsed = false;
function getSnapshot() {
  try { return window.localStorage.getItem(STORAGE_KEY) === "1"; }
  catch { return fallbackCollapsed; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
const serverSnapshot = () => false;

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const setCollapsedPersist = (value: boolean) => {
    fallbackCollapsed = value;
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch {}
    listeners.forEach(listener => listener());
  };

  const toggleCollapsed = () => setCollapsedPersist(!collapsed);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed: setCollapsedPersist, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
