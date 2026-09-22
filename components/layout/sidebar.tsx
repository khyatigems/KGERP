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
  Link2, ChevronRight as ChevronRightIcon
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { useSidebar } from "./sidebar-context";
import { useTheme } from "next-themes";
import { NavItemIcon, SidebarChevronIcon } from "@/components/ui/lottie";
import { navAnimationMap, type NavAnimationKey } from "@/components/ui/lottie/animations";

export const navGroups = [
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
      { href: "/listings", label: "Listings", icon: Globe, module: "listings:view", animKey: "listings" as NavAnimationKey },
      { href: "/masters/merge", label: "Merge Masters", icon: HardDrive, module: "inventory:manage", animKey: "settings" as NavAnimationKey },
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
      { href: "/communication", label: "Communication", icon: MessageSquare, module: "communication:view", animKey: "communication" as NavAnimationKey },
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
  animKey: keyof typeof navAnimationMap;
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
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => 
    navGroups.map(g => g.id)
  );
  
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

  const getGroupColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string; hover: string; active: string }> = {
      violet: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500", hover: "hover:bg-violet-500/20", active: "bg-violet-500/20 border-l-4 border-violet-500" },
      sky: { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500", hover: "hover:bg-sky-500/20", active: "bg-sky-500/20 border-l-4 border-sky-500" },
      emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500", hover: "hover:bg-emerald-500/20", active: "bg-emerald-500/20 border-l-4 border-emerald-500" },
      amber: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500", hover: "hover:bg-amber-500/20", active: "bg-amber-500/20 border-l-4 border-amber-500" },
      rose: { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-500", hover: "hover:bg-rose-500/20", active: "bg-rose-500/20 border-l-4 border-rose-500" },
      indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-500", hover: "hover:bg-indigo-500/20", active: "bg-indigo-500/20 border-l-4 border-indigo-500" },
    };
    return colorMap[color] || colorMap.violet;
  };

  const renderNavItem = (item: NavItem, groupColor: string) => {
    if (!allowedModules.includes("ALL") && item.module !== "dashboard" && !allowedModules.includes(item.module)) {
      return null;
    }

    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    const isHovered = hoveredHref === item.href;
    const colorClasses = getGroupColorClasses(groupColor);
    
    const AnimKey = navAnimationMap[item.animKey];
    const LucideIcon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => handleNavigation(item.href)}
        onMouseEnter={() => setHoveredHref(item.href)}
        onMouseLeave={() => setHoveredHref(null)}
        title={item.label}
        className={cn(
          "group flex items-center rounded-md transition-all duration-200",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          isActive 
            ? `${colorClasses.active} text-sidebar-foreground gem-facet-glow` 
            : `text-muted-foreground ${colorClasses.hover} hover:text-sidebar-foreground`,
          !collapsed && isActive && "premium-nav-active pl-2",
          !collapsed && !isActive && "hover:pl-4"
        )}
      >
        <NavItemIcon
          icon={<LucideIcon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? `${colorClasses.text}` : "text-muted-foreground group-hover:text-sidebar-foreground")} />}
          isActive={isActive}
          isHovered={isHovered}
          size={20}
          lottieSrc={AnimKey}
        />
        {!collapsed && (
          <>
            <span className="truncate font-medium">{item.label}</span>
            {item.badge === "conflicts" && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white animate-pulse">
                3
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const colorClasses = getGroupColorClasses(group.color);
    const GroupIcon = group.icon;
    // Use mounted state to prevent hydration mismatch: always expanded on server/initial render
    const expanded = mounted ? isGroupExpanded(group.id) : true;

    if (collapsed) {
      return (
        <div key={group.id} className="grid gap-1">
          {group.items.map(item => renderNavItem(item, group.color))}
        </div>
      );
    }

    return (
      <div key={group.id} className="grid gap-1">
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200",
            "text-xs font-semibold uppercase tracking-wider",
            expanded ? colorClasses.text : "text-muted-foreground hover:text-sidebar-foreground",
            expanded && colorClasses.bg
          )}
          aria-expanded={expanded}
          suppressHydrationWarning
        >
          <GroupIcon className={cn("h-3.5 w-3.5 shrink-0", colorClasses.text)} />
          <span className="truncate">{group.label}</span>
          <ChevronRightIcon className={cn("ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200", expanded && "rotate-90")} />
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )} suppressHydrationWarning>
          <div className="grid gap-0.5 pl-2 border-l border-sidebar-border">
            {group.items.map(item => renderNavItem(item, group.color))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground premium-sidebar">
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border",
          collapsed ? "h-20 flex-col justify-center gap-1 px-3" : "h-14 lg:h-15 flex-row justify-between px-6"
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
              <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 shrink-0 animate-sidebar-logo-in">
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
              <span className="text-lg tracking-tight whitespace-nowrap">KhyatiGems™</span>
            </span>
          )}
        </Link>
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-200 hidden lg:flex"
          >
            <SidebarChevronIcon collapsed={collapsed} />
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-200"
            >
              <SidebarChevronIcon collapsed={collapsed} />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className={cn("grid items-start text-sm font-medium gap-1.5", collapsed ? "px-1.5" : "px-2")}>
          {navGroups.map(group => renderGroup(group))}
        </nav>
      </div>
    </div>
  );
}

export function Sidebar({ allowedModules = ["ALL"] }: { allowedModules?: string[] }) {
  return <SidebarContent allowedModules={allowedModules} />;
}