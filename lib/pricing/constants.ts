import type { PricingStatus } from "./types";

export const PRICING_STATUS_LABELS: Record<PricingStatus, string> = {
  BELOW_MSP: "Below MSP",
  BREAK_EVEN: "Break Even",
  HEALTHY_MARGIN: "Healthy Margin",
  PREMIUM_MARGIN: "Premium Margin",
};

export const PRICING_STATUS_COLORS: Record<PricingStatus, string> = {
  BELOW_MSP: "bg-red-100 text-red-700 border-red-300",
  BREAK_EVEN: "bg-amber-100 text-amber-700 border-amber-300",
  HEALTHY_MARGIN: "bg-yellow-100 text-yellow-700 border-yellow-300",
  PREMIUM_MARGIN: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

export const PRICING_STATUS_ORDER: PricingStatus[] = [
  "BELOW_MSP",
  "BREAK_EVEN",
  "HEALTHY_MARGIN",
  "PREMIUM_MARGIN",
];

export const DEFAULT_MARKETPLACE_SETTING = "default_marketplace";
export const PRICING_ENGINE_ENABLED_SETTING = "pricing_engine_enabled";

export const BELOW_MSP_WARNING =
  "This item is being listed below the minimum profitable selling price.";
