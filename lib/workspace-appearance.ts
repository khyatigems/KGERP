export const WORKSPACE_PALETTES = [
  { id: "sapphire-facet", label: "Sapphire", color: "#4269c8" },
  { id: "emerald-crystal", label: "Emerald", color: "#168369" },
  { id: "amethyst-prism", label: "Amethyst", color: "#8062c2" },
] as const;
export type WorkspacePalette = typeof WORKSPACE_PALETTES[number]["id"];
export type DashboardViewPreference = "trading" | "classic";
export type WorkspaceAppearance = { palette: WorkspacePalette; motion: boolean; dashboardView: DashboardViewPreference };
export const APPEARANCE_STORAGE_KEY = "khyatigems-appearance-v2";
export const DEFAULT_APPEARANCE: WorkspaceAppearance = { palette: "sapphire-facet", motion: true, dashboardView: "trading" };
export function normalizeWorkspacePalette(value: unknown): WorkspacePalette {
  if (value === "emerald" || value === "emerald-crystal") return "emerald-crystal";
  if (value === "royal" || value === "amethyst-prism") return "amethyst-prism";
  return "sapphire-facet";
}
export function parseWorkspaceAppearance(value: unknown): WorkspaceAppearance {
  const saved = value && typeof value === "object" ? value as Partial<WorkspaceAppearance> : {};
  return { palette: normalizeWorkspacePalette(saved.palette), motion: saved.motion !== false, dashboardView: saved.dashboardView === "classic" ? "classic" : "trading" };
}
// Apply before paint so the legacy glass/palette does not flash on reload.
export const APPEARANCE_BOOTSTRAP = `try{var a=JSON.parse(localStorage.getItem('${APPEARANCE_STORAGE_KEY}')||'{}'),r=document.documentElement,p=a.palette;r.dataset.workspaceTheme=p==='emerald-crystal'||p==='amethyst-prism'?p:'sapphire-facet';r.dataset.motion=a.motion===false?'reduced':'normal';r.dataset.dashboardView=a.dashboardView==='classic'?'classic':'trading';delete r.dataset.premium;delete r.dataset.palette;}catch(e){document.documentElement.dataset.workspaceTheme='sapphire-facet';}`;
