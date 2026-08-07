"use client";

import { useWatch } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInventoryCompleteness } from "@/lib/inventory-completeness";
import type { CompletenessValues } from "@/lib/inventory-completeness";
import type { FormInputValues } from "./inventory-form.types";

interface Props {
  form: UseFormReturn<FormInputValues>;
}

export function InventoryCompletenessPanel({ form }: Props) {
  const [open, setOpen] = useState(true);
  const watched = useWatch({ control: form.control });
  const result = getInventoryCompleteness(watched as CompletenessValues);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/50 transition-all duration-300",
        result.coreMissing.length > 0
          ? "border-red-500/30"
          : result.recommendedMissing.length > 0
            ? "border-amber-500/30"
            : "border-emerald-500/30"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Completeness Checklist</h3>
          <span
            className={cn(
              "text-[10px] font-semibold rounded-full px-2 py-0.5",
              result.coreMissing.length > 0
                ? "bg-red-500/10 text-red-600"
                : result.recommendedMissing.length > 0
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-emerald-500/10 text-emerald-600"
            )}
          >
            {result.passed}/{result.total}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                result.score >= 100
                  ? "bg-emerald-500"
                  : result.coreMissing.length > 0
                    ? "bg-red-500"
                    : "bg-primary"
              )}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {result.fields.map((field) => (
            <div key={field.key} className="flex items-start gap-2 py-0.5">
              {field.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : field.severity === "core" ? (
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs">
                  <span className="font-medium">{field.label}</span>
                  {field.severity === "core" && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wide text-red-500">required</span>
                  )}
                  {field.severity === "recommended" && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wide text-muted-foreground">recommended</span>
                  )}
                </div>
                {!field.ok && field.message && (
                  <p className="text-[10px] text-muted-foreground">{field.message}</p>
                )}
              </div>
            </div>
          ))}

          {result.coreMissing.length > 0 && (
            <p className="text-[10px] text-red-500 pt-2">
              Fix required fields to save. {result.coreMissing.length} missing.
            </p>
          )}
          {result.coreMissing.length === 0 && result.recommendedMissing.length > 0 && (
            <p className="text-[10px] text-amber-500 pt-2">
              Core fields are complete. {result.recommendedMissing.length} recommended field(s) missing — a summary will appear at save.
            </p>
          )}
          {result.coreMissing.length === 0 && result.recommendedMissing.length === 0 && (
            <p className="text-[10px] text-emerald-500 pt-2">All important fields are filled. Ready to save.</p>
          )}
        </div>
      )}
    </div>
  );
}
