"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE, normalizeWorkspacePalette, parseWorkspaceAppearance, type WorkspaceAppearance } from "@/lib/workspace-appearance";
type AppearanceContext = { appearance: WorkspaceAppearance; updateAppearance: (patch: Partial<WorkspaceAppearance>) => void; ready: boolean };
const Context = createContext<AppearanceContext | null>(null);
function apply(appearance: WorkspaceAppearance) {
  const root = document.documentElement;
  root.dataset.workspaceTheme = appearance.palette;
  root.dataset.motion = appearance.motion ? "normal" : "reduced";
  root.dataset.dashboardView = appearance.dashboardView;
  delete root.dataset.premium; delete root.dataset.palette;
}
export function WorkspaceAppearanceProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);
  const current = useRef(DEFAULT_APPEARANCE);
  const changed = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    let next = DEFAULT_APPEARANCE;
    try { next = parseWorkspaceAppearance(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) || "{}")); } catch {}
    current.current = next; setAppearance(next); apply(next); setReady(true);
  }, []);
  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController(), revision = changed.current;
    fetch("/api/user/theme", { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => {
      if (!data || controller.signal.aborted || changed.current !== revision) return;
      const next = { ...current.current, palette: normalizeWorkspacePalette(data.palette) };
      current.current = next; setAppearance(next); apply(next);
      try { localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next)); } catch {}
    }).catch(() => {});
    return () => controller.abort();
  }, [session?.user?.id]);
  const updateAppearance = (patch: Partial<WorkspaceAppearance>) => {
    changed.current += 1;
    const next = { ...current.current, ...patch };
    current.current = next; setAppearance(next); apply(next);
    try { localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next)); } catch { toast.error("Appearance could not be remembered on this device."); }
    document.cookie = `kg-dashboard-view=${next.dashboardView}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === "https:" ? "; Secure" : ""}`;
    if (patch.palette && session?.user?.id) saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
      try {
        const response = await fetch("/api/user/theme", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ palette: patch.palette }) });
        if (!response.ok) throw new Error("Unable to save appearance");
      } catch { toast.error("Appearance changed on this device; account preference could not be saved."); }
    });
  };
  return <Context.Provider value={{ appearance, updateAppearance, ready }}>{children}</Context.Provider>;
}
export function useWorkspaceAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace appearance provider is missing");
  return value;
}
