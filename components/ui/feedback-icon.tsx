import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import type { FeedbackState } from "@/components/ui/rich-feedback";

// Official Lucide icons. Keep the full circle on success; the double-check glyph
// and open-circle variants are ambiguous at notification sizes.
const icons = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
  normal: Info,
  loading: LoaderCircle,
} as const;

export function FeedbackIcon({ state, size = 20, className }: { state: FeedbackState; size?: number; className?: string }) {
  const Icon = icons[state];
  return <Icon
    size={size}
    strokeWidth={2}
    absoluteStrokeWidth
    aria-hidden="true"
    focusable="false"
    className={["erp-feedback-status-icon", state === "loading" && "erp-feedback-spin", className].filter(Boolean).join(" ")}
  />;
}
