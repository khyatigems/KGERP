"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  ShoppingBag,
  Users,
  BarChart,
  Settings,
  UserCog,
  Globe,
  Printer
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/listings", label: "Listings", icon: Globe },
  { href: "/labels", label: "Labels", icon: Printer },
  { href: "/quotes", label: "Quotations", icon: FileText },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart },
  { href: "/users", label: "Users", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-6 lg:h-[60px] justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground" onClick={onNavigate}>
          <span className="text-lg tracking-tight">KhyatiGems™ ERP</span>
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-3 transition-all duration-200",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary pl-2" 
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:pl-4"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function Sidebar() {
  return <SidebarContent />;
}
