"use client";

import { cn } from "@/lib/utils";
import { Package, Search, ShoppingCart, BarChart3, Table2 } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: "table" | "search" | "cart" | "data" | "default";
  action?: React.ReactNode;
  className?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  table: <Table2 className="h-10 w-10 text-muted-foreground/60" />,
  search: <Search className="h-10 w-10 text-muted-foreground/60" />,
  cart: <ShoppingCart className="h-10 w-10 text-muted-foreground/60" />,
  data: <BarChart3 className="h-10 w-10 text-muted-foreground/60" />,
  default: <Package className="h-10 w-10 text-muted-foreground/60" />,
};

const titleMap: Record<string, string> = {
  table: "No data to display",
  search: "No results found",
  cart: "Cart is empty",
  data: "No data available",
  default: "Nothing here yet",
};

const descMap: Record<string, string> = {
  table: "Records will appear here once they are added.",
  search: "Try adjusting your search terms or filters.",
  cart: "Add items to get started.",
  data: "Check back later for updates.",
  default: "Content will appear here once it is available.",
};

export function EmptyState({
  title,
  description,
  icon,
  variant = "default",
  action,
  className,
}: EmptyStateProps) {
  const resolvedIcon = icon ?? iconMap[variant] ?? iconMap.default;
  const resolvedTitle = title ?? titleMap[variant] ?? titleMap.default;
  const resolvedDesc = description ?? descMap[variant] ?? descMap.default;

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center sass-enter", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-muted/50 rounded-full blur-xl animate-breathe" />
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed bg-card text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:text-primary/70">
          {resolvedIcon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {resolvedTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {resolvedDesc}
      </p>
      {action && (
        <div className="sass-enter" style={{ animationDelay: "0.2s" }}>
          {action}
        </div>
      )}
    </div>
  );
}
