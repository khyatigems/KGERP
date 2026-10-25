"use client";

import type { ReactNode } from "react";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function InventoryFilterPanel({ open, onOpenChange, trigger, children }: { open: boolean; onOpenChange: (open: boolean) => void; trigger: ReactNode; children: ReactNode }) {
  const mobile = useMobileLayout();
  if (mobile) return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetTrigger asChild>{trigger}</SheetTrigger>
    <SheetContent side="bottom" className="max-h-[90dvh] gap-0 rounded-t-2xl" aria-describedby="inventory-filter-description">
      <SheetHeader><SheetTitle>Filter inventory</SheetTitle><SheetDescription id="inventory-filter-description">Selections update your results immediately.</SheetDescription></SheetHeader>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5">{children}</div>
      <SheetFooter><Button onClick={() => onOpenChange(false)}>Show results</Button></SheetFooter>
    </SheetContent>
  </Sheet>;
  return <Popover open={open} onOpenChange={onOpenChange}><PopoverTrigger asChild>{trigger}</PopoverTrigger><PopoverContent className="max-h-[min(80dvh,650px)] w-[min(380px,calc(100vw-32px))] overflow-y-auto rounded-2xl p-4" align="end">{children}</PopoverContent></Popover>;
}
