"use client";

import { Logo } from "@/components/ui/logo";
import { LiveClock } from "./live-clock";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { AnimatedGreeting } from "@/components/ui/animated-greeting";

export type DashboardHeaderProps = {
  dbConnection?: string | null;
  onRefresh?: () => void;
  name?: string | null;
};

export function DashboardHeader({ dbConnection, onRefresh, name }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-xl border border-border bg-card p-4 md:p-5 sass-enter gem-fade-in gem-shimmer-border">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
           <Logo className="h-7 w-7 text-primary" />
        </div>
        <div>
          <div className="text-foreground">
            {/* Animated greeting replaces static heading while preserving styles */}
              <div className="text-xl font-bold tracking-tight">
              <AnimatedGreeting name={name} />
            </div>
            <p className="text-xs text-muted-foreground">
              Khyati Gems ERP
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block text-right">
             <LiveClock />
        </div>
        
        <div className="h-6 w-px bg-border hidden md:block" />

        <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
              dbConnection === 'Turso Cloud'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
                {dbConnection || 'Unknown'}
            </div>
            <Button
              onClick={onRefresh}
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
            >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
            </Button>
        </div>
      </div>
    </div>
  );
}
