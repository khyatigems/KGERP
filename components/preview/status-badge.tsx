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
          label: "Available now",
          icon: CheckCircle2,
          className: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20",
          iconClass: "text-emerald-600"
        };
      case "SOLD":
        return {
          label: "Sold",
          icon: XCircle,
          className: "bg-red-50 text-red-700 border-red-200 ring-red-500/20",
          iconClass: "text-red-600"
        };
      case "RESERVED":
        return {
          label: "Reserved",
          icon: Lock,
          className: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20",
          iconClass: "text-amber-600"
        };
      case "MEMO":
        return {
          label: "Memo",
          icon: Clock,
          className: "bg-primary/10 text-primary border-primary/20 ring-primary/20",
          iconClass: "text-primary"
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
          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-150",
          config.className
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", config.iconClass)} />
        {config.label}
      </div>
    </div>
  );
}
