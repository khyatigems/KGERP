"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut, Menu, ChevronRight, Home, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGlobalLoader } from "@/components/global-loader-provider";

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

interface TopbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    lastLogin?: Date | string | null;
  };
}

export function Topbar({ user }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { showLoader } = useGlobalLoader();

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
            <Link href="/" className="hover:text-foreground transition-colors" onClick={() => { if (pathname !== "/") showLoader(); }}>
              <Home className="h-3 w-3" />
            </Link>
            {breadcrumbs.map((crumb) => (
              <div key={crumb.href} className="flex items-center">
                <ChevronRight className="h-3 w-3 mx-1" />
                {crumb.isLast ? (
                  <span className="font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors" onClick={() => showLoader()}>
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
         
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                {user?.image && (user.image.includes('<svg') || user.image.trim().startsWith('<svg')) ? (
                  <div 
                    className="w-8 h-8 rounded-full overflow-hidden shrink-0"
                    dangerouslySetInnerHTML={{ __html: user.image }}
                  />
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}</AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start cursor-default">
                 <span className="text-xs font-medium">Role</span>
                 <span className="text-xs text-muted-foreground">{user?.role}</span>
              </DropdownMenuItem>
              {user?.lastLogin && (
                <DropdownMenuItem className="flex flex-col items-start cursor-default">
                  <span className="text-xs font-medium">Last Login</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(user.lastLogin).toLocaleString()}
                  </span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </header>
  );
}
