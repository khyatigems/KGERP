export const WORKSPACE_PALETTES = [
  { id: "sapphire-facet", label: "Sapphire", color: "#4269c8" },
  { id: "emerald-crystal", label: "Emerald", color: "#168369" },
  { id: "amethyst-prism", label: "Amethyst", color: "#8062c2" },
] as const;
export type WorkspacePalette = typeof WORKSPACE_PALETTES[number]["id"];
export type DashboardViewPreference = "trading" | "classic";
export const WORKSPACE_SURFACES = [
  { id: "slate", label: "English Slate", background: "#e7e9ed", card: "#f1f2f4", sidebar: "#dde1e7" },
  { id: "stone", label: "Warm Stone", background: "#e9e5df", card: "#f3f0eb", sidebar: "#dfdad2" },
  { id: "sage", label: "Sage Grey", background: "#e4e9e5", card: "#eff3ef", sidebar: "#d9e1da" },
] as const;
export type WorkspaceAppearance = {
  palette: WorkspacePalette; motion: boolean; dashboardView: DashboardViewPreference;
  surface: typeof WORKSPACE_SURFACES[number]["id"];
  sidebar: "matching" | "dark"; density: "comfortable" | "compact"; textSize: "standard" | "large";
};
export const APPEARANCE_STORAGE_KEY = "khyatigems-appearance-v2";
export const DEFAULT_APPEARANCE: WorkspaceAppearance = { palette: "sapphire-facet", motion: true, dashboardView: "trading", surface: "slate", sidebar: "matching", density: "comfortable", textSize: "standard" };
export function normalizeWorkspacePalette(value: unknown): WorkspacePalette {
  if (value === "emerald" || value === "emerald-crystal") return "emerald-crystal";
  if (value === "royal" || value === "amethyst-prism") return "amethyst-prism";
  return "sapphire-facet";
}
export function parseWorkspaceAppearance(value: unknown): WorkspaceAppearance {
  const saved = value && typeof value === "object" ? value as Partial<WorkspaceAppearance> : {};
  return {
    palette: normalizeWorkspacePalette(saved.palette), motion: saved.motion !== false,
    dashboardView: saved.dashboardView === "classic" ? "classic" : "trading",
    surface: saved.surface === "stone" || saved.surface === "sage" ? saved.surface : "slate",
    sidebar: saved.sidebar === "dark" ? "dark" : "matching",
    density: saved.density === "compact" ? "compact" : "comfortable",
    textSize: saved.textSize === "large" ? "large" : "standard",
  };
}
// Apply before paint so the legacy glass/palette does not flash on reload.
export const APPEARANCE_BOOTSTRAP = `try{var a=JSON.parse(localStorage.getItem('${APPEARANCE_STORAGE_KEY}')||'{}'),r=document.documentElement,p=a.palette;r.dataset.workspaceTheme=p==='emerald-crystal'||p==='amethyst-prism'?p:'sapphire-facet';r.dataset.motion=a.motion===false?'reduced':'normal';r.dataset.dashboardView=a.dashboardView==='classic'?'classic':'trading';r.dataset.surface=a.surface==='stone'||a.surface==='sage'?a.surface:'slate';r.dataset.sidebar=a.sidebar==='dark'?'dark':'matching';r.dataset.density=a.density==='compact'?'compact':'comfortable';r.dataset.textSize=a.textSize==='large'?'large':'standard';r.dataset.workspaceMode=localStorage.getItem('theme')==='dim'?'dim':'normal';delete r.dataset.premium;delete r.dataset.palette;}catch(e){document.documentElement.dataset.workspaceTheme='sapphire-facet';}`;
