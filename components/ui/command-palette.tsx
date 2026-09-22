"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { LottieIcon } from "@/components/ui/lottie";
import {
  LayoutDashboard, Diamond, Globe, ShoppingCart, FileText, Tag, PackageCheck,
  Users, BarChart3, Settings, Wallet, ShoppingBag, Truck, RotateCcw,
  Search, Keyboard, ChevronRight, Plus, Send, Download, RefreshCw, Zap
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: "navigation" | "action" | "search" | "settings";
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<CommandItem["category"] | "all">("all");

  const commands = useCallback((): CommandItem[] => {
    const baseCommands: CommandItem[] = [
      // Navigation
      { id: "go-dashboard", label: "Go to Dashboard", description: "View main dashboard", icon: <LayoutDashboard className="h-4 w-4" />, shortcut: "G D", category: "navigation", action: () => router.push("/") },
      { id: "go-inventory", label: "Go to Inventory", description: "Manage gemstone inventory", icon: <Diamond className="h-4 w-4" />, shortcut: "G I", category: "navigation", action: () => router.push("/inventory") },
      { id: "go-listings", label: "Go to Listings", description: "Manage marketplace listings", icon: <Globe className="h-4 w-4" />, shortcut: "G L", category: "navigation", action: () => router.push("/listings") },
      { id: "go-sales", label: "Go to Sales", description: "View sales and invoices", icon: <ShoppingCart className="h-4 w-4" />, shortcut: "G S", category: "navigation", action: () => router.push("/sales") },
      { id: "go-customers", label: "Go to Customers", description: "Manage customer records", icon: <Users className="h-4 w-4" />, shortcut: "G C", category: "navigation", action: () => router.push("/customers") },
      { id: "go-vendors", label: "Go to Vendors", description: "Manage vendor records", icon: <Truck className="h-4 w-4" />, shortcut: "G V", category: "navigation", action: () => router.push("/vendors") },
      { id: "go-reports", label: "Go to Reports", description: "View analytics and reports", icon: <BarChart3 className="h-4 w-4" />, shortcut: "G R", category: "navigation", action: () => router.push("/reports") },
      { id: "go-settings", label: "Go to Settings", description: "Configure application settings", icon: <Settings className="h-4 w-4" />, shortcut: "G S", category: "navigation", action: () => router.push("/settings") },

      // Actions
      { id: "new-inventory", label: "New Inventory Item", description: "Add a new gemstone to inventory", icon: <Plus className="h-4 w-4" />, shortcut: "N I", category: "action", action: () => router.push("/inventory/new") },
      { id: "new-invoice", label: "Create New Invoice", description: "Generate a new sales invoice", icon: <FileText className="h-4 w-4" />, shortcut: "N N", category: "action", action: () => router.push("/sales/new") },
      { id: "new-quote", label: "Create Quotation", description: "Create a new quotation", icon: <Send className="h-4 w-4" />, shortcut: "N Q", category: "action", action: () => router.push("/quotes/new") },
      { id: "new-purchase", label: "New Purchase Order", description: "Create a new purchase order", icon: <ShoppingBag className="h-4 w-4" />, shortcut: "N P", category: "action", action: () => router.push("/purchases/new") },
      { id: "new-customer", label: "New Customer", description: "Add a new customer", icon: <Users className="h-4 w-4" />, shortcut: "N C", category: "action", action: () => router.push("/customers/new") },
      { id: "new-vendor", label: "New Vendor", description: "Add a new vendor", icon: <Truck className="h-4 w-4" />, shortcut: "N V", category: "action", action: () => router.push("/vendors/new") },
      { id: "export-data", label: "Export Data", description: "Export current view to CSV/Excel", icon: <Download className="h-4 w-4" />, shortcut: "E", category: "action", action: () => { /* trigger export */ } },
      { id: "refresh-data", label: "Refresh Data", description: "Refresh current page data", icon: <RefreshCw className="h-4 w-4" />, shortcut: "R", category: "action", action: () => window.location.reload() },

      // Search
      { id: "search-inventory", label: "Search Inventory", description: "Search gemstones in inventory", icon: <Search className="h-4 w-4" />, shortcut: "S I", category: "search", action: () => router.push("/inventory?search=true") },
      { id: "search-customers", label: "Search Customers", description: "Search customer records", icon: <Search className="h-4 w-4" />, shortcut: "S C", category: "search", action: () => router.push("/customers?search=true") },
      { id: "search-invoices", label: "Search Invoices", description: "Search sales invoices", icon: <Search className="h-4 w-4" />, shortcut: "S S", category: "search", action: () => router.push("/sales?search=true") },

      // Settings
      { id: "toggle-theme", label: "Toggle Theme", description: "Switch between light and dark mode", icon: <Zap className="h-4 w-4" />, shortcut: "T T", category: "settings", action: () => { document.documentElement.classList.toggle("dark"); localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light"); } },
      { id: "toggle-premium", label: "Toggle Premium Mode", description: "Enable/disable premium animations", icon: <Zap className="h-4 w-4" />, shortcut: "T P", category: "settings", action: () => { const isPremium = document.documentElement.dataset.premium === "true"; document.documentElement.dataset.premium = String(!isPremium); localStorage.setItem("premium", String(!isPremium)); } },
    ];

    return baseCommands;
  }, [router]);

  const filteredCommands = React.useMemo(() => {
    let result = commands();
    
    if (selectedCategory !== "all") {
      result = result.filter(cmd => cmd.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cmd => 
        cmd.label.toLowerCase().includes(query) ||
        cmd.description?.toLowerCase().includes(query) ||
        cmd.shortcut?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [commands, searchQuery, selectedCategory]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-hidden" style={{ transformOrigin: "top" }}>
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Command Palette</DialogTitle>
              <DialogDescription className="text-xs">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd> to open, <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> to close
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-[calc(70vh-120px)]">
          <Command>
            <CommandInput 
              ref={inputRef}
              placeholder="Type a command or search..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-sm"
            />
            <CommandList className="max-h-[400px]">
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <LottieIcon src="noData" size={32} className="text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mt-2">No commands found</p>
                  <p className="text-xs text-muted-foreground/60">Try a different search term</p>
                </div>
              </CommandEmpty>
              
              {["navigation", "action", "search", "settings"].map((category) => {
                const categoryCommands = filteredCommands.filter(cmd => cmd.category === category);
                if (categoryCommands.length === 0) return null;
                
                const categoryLabels: Record<string, string> = {
                  navigation: "Navigation",
                  action: "Actions",
                  search: "Search",
                  settings: "Settings",
                };
                
                const categoryIcons: Record<string, React.ReactNode> = {
                  navigation: <LayoutDashboard className="h-3 w-3" />,
                  action: <Zap className="h-3 w-3" />,
                  search: <Search className="h-3 w-3" />,
                  settings: <Settings className="h-3 w-3" />,
                };
                
                return (
                  <CommandGroup key={category} heading={<span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">{categoryIcons[category]} {categoryLabels[category]}</span>}>
                    {categoryCommands.map((cmd) => (
                      <CommandItem
                        key={cmd.id}
                        onSelect={cmd.action}
                        className="relative"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 items-center justify-center text-muted-foreground">
                            {cmd.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{cmd.label}</div>
                            {cmd.description && <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>}
                          </div>
                          {cmd.shortcut && (
                            <kbd className="ml-2 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded">
                              {cmd.shortcut.split(" ").map((key, i) => (
                                <span key={i}>{key}</span>
                              ))}
                            </kbd>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommandPaletteTrigger({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}