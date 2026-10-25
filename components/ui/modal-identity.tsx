"use client";

import { CircleAlert, PanelsTopLeft, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModalTone = "default" | "confirmation" | "warning" | "destructive";

export function ModalIdentity({ tone = "default" }: { tone?: ModalTone }) {
  const Icon = tone === "destructive" ? CircleAlert : tone === "warning" ? TriangleAlert : tone === "confirmation" ? ShieldCheck : PanelsTopLeft;
  return <div className="mb-4 flex items-center gap-3" data-slot="modal-identity">
    <div aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", tone === "destructive" ? "border-destructive/20 bg-destructive/10 text-destructive" : tone === "warning" ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400")}><Icon size={20} /></div>
    <div><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Khyati ERP</div><div className="mt-1 text-xs font-medium text-foreground">{tone === "destructive" ? "Confirm destructive action" : tone === "warning" ? "Review before continuing" : tone === "confirmation" ? "Action confirmation" : "Workspace details"}</div></div>
  </div>;
}
