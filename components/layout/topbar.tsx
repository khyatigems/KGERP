"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut, Menu, ChevronRight, Home } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/sidebar";

const routeTitles: Record<string, string> = {
  "/": "Dashboard Overview",
  "/inventory": "Inventory Management",
  "/listings": "Listing Management",
  "/labels": "Label Printing System",
  "/quotes": "Quotation Management",
  "/sales": "Sales & Orders",
  "/purchases": "Purchase Orders",
  "/vendors": "Vendor Management",
  "/reports": "Business Reports",
  "/users": "User Administration",
  "/settings": "System Settings",
};

export function Topbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    return paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join('/')}`;
      return {
        label: path.charAt(0).toUpperCase() + path.slice(1),
        href,
        isLast: index === paths.length - 1
      };
    });
  };

  const currentTitle = routeTitles[pathname] || 
    (pathname.startsWith('/settings') ? 'System Settings' : 
    pathname.startsWith('/inventory') ? 'Inventory Management' : 'Dashboard');

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[250px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Mobile navigation menu
          </SheetDescription>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      
      <div className="flex flex-col flex-1 gap-0.5">
        <h1 className="font-semibold text-xl tracking-tight text-foreground hidden md:block">
          {currentTitle}
        </h1>
        
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="hidden md:flex items-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              <Home className="h-3 w-3" />
            </Link>
            {breadcrumbs.map((crumb) => (
              <div key={crumb.href} className="flex items-center">
                <ChevronRight className="h-3 w-3 mx-1" />
                {crumb.isLast ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
         <span className="font-semibold text-lg md:hidden">KhyatiGems™</span>
        <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
}
