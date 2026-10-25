"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type FeedbackState = "success" | "error" | "warning" | "info" | "loading" | "normal";

const labels: Record<FeedbackState, string> = {
  success: "Completed", error: "Needs attention", warning: "Please review",
  info: "Update", loading: "In progress", normal: "Notification",
};

export function RichFeedbackTitle({ state, children, label }: { state: FeedbackState; children?: ReactNode; label?: string }) {
  return <div className="erp-feedback-heading"><div className="erp-feedback-eyebrow">{label || "KHYATI ERP"}<span />{labels[state]}</div><div className="erp-feedback-title">{children}</div></div>;
}

export function RichFeedbackDetails({ children, label = "View details" }: { children?: ReactNode; label?: string }) {
  return <details className="erp-feedback-details"><summary><ChevronRight size={13} />{label}</summary><div className="erp-feedback-detail-content">{children}</div></details>;
}
