"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Home, Diamond, Globe, Tag, PackageCheck, FileText, ShoppingCart, 
  RotateCcw, ShoppingBag, Truck, Users, BarChart3, UserCog, Settings, 
  Wallet, LayoutDashboard, AlertTriangle, Scale, 
  Activity, Box, Receipt, MessageSquare, LayoutGrid, HardDrive, 
  Link2, ChevronRight as ChevronRightIcon, ListPlus
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { useSidebar } from "./sidebar-context";
import { useTheme } from "next-themes";

type NavAnimationKey = string;

export const navGroups = [
  {
    id: "website", label: "Website", color: "sky", icon: Globe,
    items: [{ href: "/website-management", label: "Website Management", icon: Globe, module: "settings:manage", animKey: "settings" as NavAnimationKey }],
  },
  {
    id: "overview",
    label: "Overview",
    color: "violet",
    icon: LayoutGrid,
    items: [
      { href: "/", label: "Dashboard", icon: Home, module: "dashboard", animKey: "dashboard" as NavAnimationKey },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    color: "violet",
    icon: Diamond,
    items: [
      { href: "/inventory", label: "Inventory", icon: Diamond, module: "inventory:view", animKey: "inventory" as NavAnimationKey },
      { href: "/masters/merge", label: "Merge Customers", icon: HardDrive, module: "customers:merge", animKey: "settings" as NavAnimationKey },
      { href: "/inventory/matched-pairs", label: "Matched Pairs & Sets", icon: Link2, module: "inventory:view", animKey: "matched-pairs" as NavAnimationKey },
    ],
  },
  {
    id: "marketplaces",
    label: "Marketplaces",
    color: "sky",
    icon: Globe,
    items: [
      { href: "/settings/marketplace-connections", label: "Connections", icon: Link2, module: "settings:manage", animKey: "control-center" as NavAnimationKey },
      { href: "/marketplace-control-center", label: "Control Center", icon: LayoutDashboard, module: "listings:view", animKey: "control-center" as NavAnimationKey, badge: "conflicts" },
      { href: "/marketplace-listings", label: "Listings", icon: Globe, module: "listings:view", animKey: "listings" as NavAnimationKey },
      { href: "/marketplace-create-listings", label: "Create Listings", icon: ListPlus, module: "listings:view", animKey: "listings" as NavAnimationKey },
      { href: "/marketplace-drafts", label: "Drafts", icon: FileText, module: "listings:view", animKey: "listings" as NavAnimationKey },
      { href: "/marketplace-orders", label: "Orders", icon: ShoppingCart, module: "listings:view", animKey: "sales" as NavAnimationKey },
      { href: "/marketplace-sync-history", label: "Sync History", icon: Activity, module: "listings:view", animKey: "reports" as NavAnimationKey },
      { href: "/marketplace-conflicts", label: "Conflicts", icon: AlertTriangle, module: "listings:view", animKey: "conflicts" as NavAnimationKey },
      { href: "/marketplace-reconciliation", label: "Reconciliation", icon: Scale, module: "listings:view", animKey: "reconciliation" as NavAnimationKey },
    ],
  },
  {
    id: "sell-flow",
    label: "Sell Flow",
    color: "emerald",
    icon: ShoppingCart,
    items: [
      { href: "/quotes", label: "Quotations", icon: FileText, module: "quotations:view", animKey: "quotes" as NavAnimationKey },
      { href: "/sales", label: "Sales", icon: ShoppingCart, module: "sales:view", animKey: "sales" as NavAnimationKey },
      { href: "/invoices", label: "Invoices", icon: Receipt, module: "sales:view", animKey: "invoices" as NavAnimationKey },
      { href: "/sales-returns", label: "Sales Returns", icon: RotateCcw, module: "sales:view", animKey: "sales-returns" as NavAnimationKey },
      { href: "/advances", label: "Advances", icon: Wallet, module: "sales:view", animKey: "advances" as NavAnimationKey },
    ],
  },
  {
    id: "buy-partners",
    label: "Buy & Partners",
    color: "amber",
    icon: Truck,
    items: [
      { href: "/purchases", label: "Purchases", icon: ShoppingBag, module: "purchases:view", animKey: "purchases" as NavAnimationKey },
      { href: "/vendors", label: "Vendors", icon: Truck, module: "vendors:view", animKey: "vendors" as NavAnimationKey },
      { href: "/customers", label: "Customers", icon: Users, module: "customers:view", animKey: "customers" as NavAnimationKey },
    ],
  },
  {
    id: "fulfill",
    label: "Fulfill",
    color: "rose",
    icon: Box,
    items: [
      { href: "/labels", label: "Labels", icon: Tag, module: "labels:view", animKey: "labels" as NavAnimationKey },
      { href: "/erp/packaging", label: "Packaging Identity", icon: PackageCheck, module: "packaging:view", animKey: "packaging" as NavAnimationKey },
    ],
  },
  {
    id: "insight-admin",
    label: "Insight & Admin",
    color: "indigo",
    icon: BarChart3,
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, module: "reports:view", animKey: "reports" as NavAnimationKey },
      { href: "/communication", label: "Communication Center", icon: MessageSquare, module: "communication:view", animKey: "communication" as NavAnimationKey, badge: "communication-unread" },
      { href: "/activity-log", label: "Activity Log", icon: Activity, module: "activity:view", animKey: "settings" as NavAnimationKey },
      { href: "/users", label: "Users", icon: UserCog, module: "users:manage", animKey: "users" as NavAnimationKey },
      { href: "/settings", label: "Settings", icon: Settings, module: "settings:manage", animKey: "settings" as NavAnimationKey },
    ],
  },
];

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
  animKey: NavAnimationKey;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

interface SidebarContentProps {
  onNavigate?: () => void;
  allowedModules?: string[];
}

export function SidebarContent({ onNavigate, allowedModules = ["ALL"] }: SidebarContentProps) {
  const pathname = usePathname();
  const { showLoader } = useGlobalLoader();
  const { collapsed, toggleCollapsed } = useSidebar();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => 
    navGroups.map(g => g.id)
  );
  const [pendingConflicts, setPendingConflicts] = useState(0);
  const [unreadCommunications, setUnreadCommunications] = useState(0);
  const canSeeCommunication =
    allowedModules.includes("ALL") ||
    allowedModules.includes("communication:view");
  const canSeeControlCenter =
    allowedModules.includes("ALL") ||
    allowedModules.includes("listings:view") ||
    allowedModules.includes("dashboard");
  
  useEffect(() => {
    if (!canSeeControlCenter) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/marketplace/stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && typeof json.pendingConflicts === "number") {
          setPendingConflicts(json.pendingConflicts);
        }
      } catch {}
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [canSeeControlCenter]);

  useEffect(() => {
    if (!canSeeCommunication) return;
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const response = await fetch("/api/email/communication/unread-count", { cache: "no-store" });
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && typeof result.unread === "number") setUnreadCommunications(result.unread);
      } catch {}
    };
    void loadUnread();
    const interval = setInterval(loadUnread, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canSeeCommunication]);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const stored = window.localStorage.getItem("khyatigems-sidebar-groups");
      if (stored) {
        setExpandedGroups(JSON.parse(stored));
      }
    } catch {}
  }, []);
  
  const isDark = mounted && resolvedTheme === "dark";
  const brandNavy = isDark ? "#FFFFFF" : "#181547";
  const brandRed = isDark ? "#FFFFFF" : "#D03837";

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];
      try {
        window.localStorage.setItem("khyatigems-sidebar-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isGroupExpanded = (groupId: string) => expandedGroups.includes(groupId);

  const handleNavigation = (href: string) => {
    if (onNavigate) onNavigate();
    if (href !== pathname) {
      showLoader(); 
    }
  };

  const renderNavItem = (item: NavItem) => {
    if (!allowedModules.includes("ALL") && item.module !== "dashboard" && !allowedModules.includes(item.module) && !(item.href === "/advances" && (allowedModules.includes("advances:manage") || allowedModules.includes("receivables:view"))) && !(item.module === "labels:view" && allowedModules.includes("inventory:view")) && !(item.module === "activity:view" && allowedModules.includes("reports:view")) && !(item.module === "customers:merge" && allowedModules.includes("users:manage"))) {
      return null;
    }

    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));




    const LucideIcon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => handleNavigation(item.href)}


        title={item.label}
        className={cn(
          "workspace-nav-item group relative flex items-center rounded-xl transition-colors duration-150",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          isActive && "workspace-nav-active",
          !collapsed && "text-[13px]"
        )}
      >
        <LucideIcon aria-hidden="true" className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
        {!collapsed && (
          <>
            <span className="truncate font-medium">{item.label}</span>
            {item.badge === "conflicts" && pendingConflicts > 0 && (
              <span
                title={`${pendingConflicts} open marketplace conflict${pendingConflicts === 1 ? "" : "s"}`}
                className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white px-1"
              >
                {pendingConflicts > 99 ? "99+" : pendingConflicts}
              </span>
            )}
            {item.badge === "communication-unread" && unreadCommunications > 0 && (
              <span
                title={`${unreadCommunications} unread communication${unreadCommunications === 1 ? "" : "s"}`}
                className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              >
                {unreadCommunications > 99 ? "99+" : unreadCommunications}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup) => {

    const GroupIcon = group.icon;
    // Use mounted state to prevent hydration mismatch: always expanded on server/initial render
    const expanded = mounted ? isGroupExpanded(group.id) : true;

    if (collapsed) {
      return (
        <div key={group.id} className="grid gap-1">
          {group.items.map(item => renderNavItem(item))}
        </div>
      );
    }

    return (
      <div key={group.id} className="grid gap-1">
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-150 hover:bg-sidebar-accent/50",
            "text-[10px] font-semibold uppercase tracking-[.12em]",
            "text-muted-foreground hover:text-sidebar-foreground"
          )}
          aria-expanded={expanded}
          suppressHydrationWarning
        >
          <GroupIcon className={cn("h-3.5 w-3.5 shrink-0", "text-primary/80")} />
          <span className="truncate">{group.label}</span>
          <ChevronRightIcon className={cn("ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200", expanded && "rotate-90")} />
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )} suppressHydrationWarning>
          <div className="grid gap-1 pl-1">
            {group.items.map(item => renderNavItem(item))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="workspace-sidebar sticky top-0 flex h-dvh flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "h-20 flex-col justify-center gap-1 px-3" : "h-20 flex-row justify-between px-4"
        )}
      >
        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground" onClick={() => handleNavigation("/")} title="KhyatiGems™ ERP">
          {collapsed ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 transition-all duration-300">
              <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                <g>
                  <g>
                    <polygon fill={brandRed} points="391.3,256.3 300.9,375.7 420.8,256.3" />
                    <polygon fill={brandRed} points="465.1,256.3 374.7,375.7 494.6,256.3" />
                    <polygon fill={brandRed} points="608.7,256.3 699.1,375.7 579.2,256.3" />
                    <polygon fill={brandRed} points="534.9,256.3 625.3,375.7 505.4,256.3" />
                  </g>
                  <polygon fill={brandNavy} points="641.4,256.3 793.5,375.7 872,375.7 658.2,207.8 342.1,207.8 176.5,337.9 176.5,207.8 176,207.8 128,245.4 128,738.2 176.3,792.2 176.5,792.2 176.5,430.2 500.1,792.2 745.1,518.2 788.5,469.7 723.4,469.7 453.9,469.7 497.3,518.2 680.1,518.2 500.1,719.4 320.2,518.2 276.8,469.7 198.6,382.2 358.8,256.3" />
                </g>
              </svg>
            </span>
          ) : (
            <span className="flex items-center gap-2 transition-all duration-300">
              <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 shrink-0 ">
                <g>
                  <g>
                    <polygon fill={brandRed} points="391.3,256.3 300.9,375.7 420.8,256.3" />
                    <polygon fill={brandRed} points="465.1,256.3 374.7,375.7 494.6,256.3" />
                    <polygon fill={brandRed} points="608.7,256.3 699.1,375.7 579.2,256.3" />
                    <polygon fill={brandRed} points="534.9,256.3 625.3,375.7 505.4,256.3" />
                  </g>
                  <polygon fill={brandNavy} points="641.4,256.3 793.5,375.7 872,375.7 658.2,207.8 342.1,207.8 176.5,337.9 176.5,207.8 176,207.8 128,245.4 128,738.2 176.3,792.2 176.5,792.2 176.5,430.2 500.1,792.2 745.1,518.2 788.5,469.7 723.4,469.7 453.9,469.7 497.3,518.2 680.1,518.2 500.1,719.4 320.2,518.2 276.8,469.7 198.6,382.2 358.8,256.3" />
                </g>
              </svg>
              <span className="text-base tracking-tight whitespace-nowrap">KhyatiGems™</span>
            </span>
          )}
        </Link>
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-200 lg:flex"
          >
            <ChevronRightIcon className={cn("h-4 w-4 transition-transform duration-150", !collapsed && "rotate-180")} />
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-1">

            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-200"
            >
              <ChevronRightIcon className={cn("h-4 w-4 transition-transform duration-150", !collapsed && "rotate-180")} />
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3">
        <nav className={cn("grid items-start text-sm font-medium gap-3", collapsed ? "px-1.5" : "px-2")}>
          {navGroups.map(group => renderGroup(group))}
        </nav>
      </div>
      <div className={cn("flex shrink-0 items-center gap-3 border-t border-sidebar-border p-3", collapsed && "justify-center")}><ThemeToggle />{!collapsed && <div className="min-w-0"><p className="text-xs font-medium">Appearance</p><p className="mt-0.5 text-[10px] text-muted-foreground">Theme & dashboard view</p></div>}</div>
    </div>
  );
}

export function Sidebar({ allowedModules = ["ALL"] }: { allowedModules?: string[] }) {
  return <SidebarContent allowedModules={allowedModules} />;
}
