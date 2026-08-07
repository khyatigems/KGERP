"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Gem, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompletenessResult } from "@/lib/inventory-completeness";

interface Props {
  itemName: string;
  sku?: string;
  completeness: CompletenessResult;
  status: "saving" | "success" | "error";
  errorMessage?: string;
  isUpdate?: boolean;
}

export function InventorySaveProgressToast({
  itemName,
  sku,
  completeness,
  status,
  errorMessage,
  isUpdate = false,
}: Omit<Props, "id">) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isSaving = status === "saving";
  const isSuccess = status === "success";
  const isError = status === "error";

  const ringDash = `${completeness.score} ${100 - completeness.score}`;

  return (
    <div
      className={cn(
        "w-[340px] rounded-xl border overflow-hidden",
        "bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl",
        "shadow-2xl shadow-black/20",
        isSuccess && "border-emerald-500/40",
        isSaving && "border-primary/30",
        isError && "border-red-500/40"
      )}
      style={{ pointerEvents: "auto" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="relative">
          <svg
            width="44"
            height="44"
            viewBox="0 0 36 36"
            className={cn(
              "shrink-0 transition-all duration-700",
              mounted ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
          >
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-muted/30"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={cn(
                "transition-all duration-1000 ease-out",
                isSuccess ? "stroke-emerald-500" : isSaving ? "stroke-primary" : "stroke-red-500"
              )}
              strokeDasharray={ringDash}
              strokeDashoffset={mounted ? 0 : 100}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                transition: "stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease",
              }}
            />
            <text
              x="18"
              y="20.5"
              textAnchor="middle"
              className={cn(
                "fill-foreground font-semibold text-[8px]",
                "transition-opacity duration-500",
                mounted ? "opacity-100" : "opacity-0"
              )}
            >
              {completeness.score}%
            </text>
          </svg>

          {isSaving && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          )}
          {isSuccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-500 animate-[scale-in_0.3s_ease]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {isSuccess ? "Inventory Saved" : isError ? "Save Failed" : isUpdate ? "Updating Inventory" : "Creating Inventory"}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {isSuccess && sku ? (
              <span className="text-emerald-500 font-medium">{sku}</span>
            ) : (
              itemName || "Unnamed item"
            )}
          </p>
          {isSuccess && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {completeness.passed}/{completeness.total} fields complete
            </p>
          )}
          {isError && errorMessage && (
            <p className="text-[10px] text-red-400 mt-0.5 truncate">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="px-4 pb-3 space-y-[3px]">
        {completeness.fields.map((field, i) => {
          const delay = mounted ? i * 50 : 0;
          return (
            <div
              key={field.key}
              className={cn(
                "flex items-center gap-2 py-[3px] transition-all duration-300",
                mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
              )}
              style={{ transitionDelay: `${delay}ms` }}
            >
              <div className="shrink-0">
                {isSuccess ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : isError ? (
                  <XCircle className="h-3 w-3 text-red-500" />
                ) : field.ok ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full border-2",
                      field.severity === "core"
                        ? "border-red-400"
                        : "border-muted-foreground/40"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  field.ok
                    ? "text-muted-foreground"
                    : field.severity === "core"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/70"
                )}
              >
                {field.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div
        className={cn(
          "px-4 py-2.5 border-t flex items-center justify-between",
          isSuccess && "border-emerald-500/20 bg-emerald-500/5",
          isSaving && "border-border bg-muted/30",
          isError && "border-red-500/20 bg-red-500/5"
        )}
      >
        <div className="flex items-center gap-2">
          {isSaving && (
            <>
              <Gem className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-[11px] text-primary font-medium">
                Saving
                <span className="inline-block w-6 text-left animate-[shimmer_1.5s_infinite]">
                  ...
                </span>
              </span>
            </>
          )}
          {isSuccess && (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] text-emerald-500 font-medium">
                {isUpdate ? "Updated" : "Created"} successfully
              </span>
            </>
          )}
          {isError && (
            <span className="text-[11px] text-red-400">Something went wrong</span>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
          KhyatiGems
        </span>
      </div>
    </div>
  );
}
