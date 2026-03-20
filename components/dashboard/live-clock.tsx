"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LiveClockProps {
  className?: string;
}

export function LiveClock({ className }: LiveClockProps) {
  const [time, setTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <div className="text-xl font-bold tracking-tight font-mono">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
        {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
