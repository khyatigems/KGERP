"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Diamond, Globe, Tag, PackageCheck, FileText, ShoppingCart, RotateCcw, ShoppingBag, Truck, Users, BarChart3, UserCog, Settings, Wallet, Image as ImageIcon, LayoutDashboard, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGlobalLoader } from "@/components/global-loader-provider";
import { useSidebar } from "./sidebar-context";

export const navItems = [
  { href: "/", label: "Dashboard", icon: Home, module: "dashboard" },
  { href: "/inventory", label: "Inventory", icon: Diamond, module: "inventory:view" },
  { href: "/listings", label: "Listings", icon: Globe, module: "listings:view" },
  { href: "/marketplace-control-center", label: "Marketplace Control Center", icon: LayoutDashboard, module: "listings:view" },
  { href: "/marketplace-conflicts", label: "Marketplace Conflicts", icon: AlertTriangle, module: "listings:view" },
  { href: "/labels", label: "Labels", icon: Tag, module: "reports:view" },
  { href: "/erp/packaging", label: "Packaging Identity", icon: PackageCheck, module: "packaging:view" },
  { href: "/quotes", label: "Quotations", icon: FileText, module: "quotations:view" },
  { href: "/sales", label: "Sales", icon: ShoppingCart, module: "sales:view" },
  { href: "/sales-returns", label: "Sales Returns", icon: RotateCcw, module: "sales:view" },
  { href: "/advances", label: "Advances", icon: Wallet, module: "sales:view" },
  { href: "/purchases", label: "Purchases", icon: ShoppingBag, module: "purchases:view" },
  { href: "/vendors", label: "Vendors", icon: Truck, module: "vendors:view" },
  { href: "/customers", label: "Customers", icon: Users, module: "customers:view" },
  { href: "/reports", label: "Reports", icon: BarChart3, module: "reports:view" },
  { href: "/users", label: "Users", icon: UserCog, module: "users:manage" },
  { href: "/settings/ebay-settings", label: "eBay Settings", icon: ImageIcon, module: "settings:manage" },
  { href: "/settings", label: "Settings", icon: Settings, module: "settings:manage" },
];

interface SidebarContentProps {
  onNavigate?: () => void;
  allowedModules?: string[];
}

export function SidebarContent({ onNavigate, allowedModules = ["ALL"] }: SidebarContentProps) {
  const pathname = usePathname();
  const { showLoader } = useGlobalLoader();
  const { collapsed, toggleCollapsed } = useSidebar();

  const handleNavigation = (href: string) => {
    if (onNavigate) onNavigate();
    // Only show loader if we are actually navigating to a new page
    if (href !== pathname) {
      showLoader(); 
    }
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
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Diamond className="h-5 w-5" />
            </span>
          ) : (
            <span className="text-lg tracking-tight">KhyatiGems™ ERP</span>
          )}
        </Link>
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-all duration-200 hidden lg:flex"
          >
            <ChevronRight className="h-4 w-4" />
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
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className={cn("grid items-start text-sm font-medium gap-1", collapsed ? "px-1.5" : "px-2")}>
          {navItems.map((item) => {
            if (!allowedModules.includes("ALL") && item.module !== "dashboard" && !allowedModules.includes(item.module)) {
              return null;
            }

            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavigation(item.href)}
                title={item.label}
                className={cn(
                  "group flex items-center rounded-md transition-all duration-200",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-3",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary gem-facet-glow" 
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  !collapsed && isActive && "premium-nav-active pl-2",
                  !collapsed && !isActive && "hover:pl-4"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}

export function Sidebar({ allowedModules = ["ALL"] }: { allowedModules?: string[] }) {
  return <SidebarContent allowedModules={allowedModules} />;
}
