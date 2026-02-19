"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "IN_STOCK":
        return {
          label: "Available Now",
          icon: CheckCircle2,
          className: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
          iconClass: "text-emerald-600"
        };
      case "SOLD":
        return {
          label: "Sold Out",
          icon: XCircle,
          className: "bg-red-50 text-red-700 border-red-200 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
          iconClass: "text-red-600"
        };
      case "RESERVED":
        return {
          label: "Reserved",
          icon: Lock,
          className: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
          iconClass: "text-amber-600"
        };
      case "MEMO":
        return {
          label: "On Memo",
          icon: Clock,
          className: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
          iconClass: "text-blue-600"
        };
      default:
        return {
          label: status.replace("_", " "),
          icon: CheckCircle2,
          className: "bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/20",
          iconClass: "text-gray-600"
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className="flex justify-center w-full mb-6">
      <div 
        className={cn(
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest ring-4 transition-all duration-500 animate-in fade-in zoom-in-95",
          config.className
        )}
      >
        <Icon className={cn("w-3.5 h-3.5 animate-pulse", config.iconClass)} />
        {config.label}
      </div>
    </div>
  );
}
