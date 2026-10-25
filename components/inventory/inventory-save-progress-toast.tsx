"use client";

import { Check, CheckCheck, Circle, CircleAlert, LoaderCircle, X } from "lucide-react";
import type { CompletenessResult } from "@/lib/inventory-completeness";
import { RichFeedbackDetails, RichFeedbackTitle } from "@/components/ui/rich-feedback";

interface Props {
  itemName: string;
  sku?: string;
  completeness: CompletenessResult;
  status: "saving" | "success" | "error";
  errorMessage?: string;
  isUpdate?: boolean;
  onDismiss?: () => void;
}

export function InventorySaveProgressToast({ itemName, sku, completeness, status, errorMessage, isUpdate = false, onDismiss }: Props) {
  const state = status === "saving" ? "loading" : status;
  const Icon = state === "loading" ? LoaderCircle : state === "success" ? CheckCheck : CircleAlert;
  const title = state === "loading" ? (isUpdate ? "Updating inventory" : "Saving inventory") : state === "success" ? (isUpdate ? "Inventory updated" : "Inventory created") : "Inventory could not be saved";
  return <section className="erp-feedback-card" data-state={state} aria-label="Inventory save status">
    <div className="erp-feedback-header">
      <div className="erp-feedback-icon" aria-hidden="true"><Icon size={19} className={state === "loading" ? "erp-feedback-spin" : undefined} /></div>
      <div role="status"><RichFeedbackTitle state={state} label="INVENTORY">{title}</RichFeedbackTitle></div>
      {onDismiss && <button type="button" className="erp-feedback-close ml-auto" onClick={onDismiss} aria-label="Dismiss inventory notification"><X size={15} /></button>}
    </div>
    <p className="erp-feedback-subtitle">{itemName || "Unnamed item"}{sku && <> · <strong>{sku}</strong></>}</p>
    {state === "error" ? <p className="text-xs text-destructive leading-relaxed">{errorMessage || "Please try again. Your entered details are still available."}</p> : <p className="text-xs text-muted-foreground">{state === "loading" ? "Saving your item details to Khyati ERP…" : "Your item details have been saved to Khyati ERP."}</p>}
    <div className="erp-feedback-facts"><span>{completeness.passed} / {completeness.total} fields complete</span><span>{completeness.score}% completeness</span></div>
    <RichFeedbackDetails label="Item completeness checklist">
      {completeness.fields.map((field) => <div key={field.key} className="erp-feedback-check" data-complete={field.ok}><span aria-hidden="true">{field.ok ? <Check size={13} /> : <Circle size={13} />}</span><span>{field.label} · {field.ok ? "Complete" : "Missing"}</span></div>)}
    </RichFeedbackDetails>
  </section>;
}
