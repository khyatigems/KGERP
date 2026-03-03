"use client";

import { Logo } from "@/components/ui/logo";
import { LiveClock } from "./live-clock";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  dbConnection: string;
  onRefresh: () => void;
}

export function DashboardHeader({ dbConnection, onRefresh }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-border/50 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 bg-primary/10 rounded-full p-3 flex items-center justify-center shadow-inner">
           <Logo className="animate-logo-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Khyati Gems
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Enterprise Resource Planning
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:block text-right">
             <LiveClock />
        </div>
        
        <div className="h-8 w-px bg-border hidden md:block" />

        <div className="flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${dbConnection === 'Turso Cloud' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                {dbConnection || 'Unknown DB'}
            </div>
            <Button onClick={onRefresh} variant="ghost" size="sm" className="h-7 text-xs hover:bg-primary/10">
                Refresh Data
            </Button>
        </div>
      </div>
    </div>
  );
}
