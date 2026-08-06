export const CHARGE_KEYS = [
  "LISTING_FEE",
  "PLATFORM_FEE",
  "PLATFORM_FLAT_FEE",
  "TRANSACTION_FEE",
  "PAYMENT_GATEWAY_FEE",
  "PACKAGING_FEE",
  "SHIPPING_CHARGE",
  "HANDLING_CHARGE",
  "INSURANCE",
  "MARKETING_COST",
  "CURRENCY_CONVERSION_BUFFER",
  "PROFIT_BUFFER",
  "OTHER_CHARGE",
] as const;

export type ChargeKey = (typeof CHARGE_KEYS)[number];

export const CHARGE_LABELS: Record<ChargeKey, string> = {
  LISTING_FEE: "Listing Fee",
  PLATFORM_FEE: "Platform Fee (%)",
  PLATFORM_FLAT_FEE: "Platform Flat Fee",
  TRANSACTION_FEE: "Transaction Fee",
  PAYMENT_GATEWAY_FEE: "Payment Gateway Fee",
  PACKAGING_FEE: "Packaging Fee",
  SHIPPING_CHARGE: "Shipping Charges",
  HANDLING_CHARGE: "Handling Charges",
  INSURANCE: "Insurance",
  MARKETING_COST: "Marketing Cost",
  CURRENCY_CONVERSION_BUFFER: "Currency Conversion Buffer",
  PROFIT_BUFFER: "Profit Buffer",
  OTHER_CHARGE: "Other Charges",
};

export type AmountType = "FLAT" | "PERCENT";

export type MarginType = "PERCENT" | "FLAT";

export interface FeeCharge {
  id: string;
  chargeKey: ChargeKey;
  name: string;
  enabled: boolean;
  amountType: AmountType;
  amount: number;
  countryCode: string | null;
  sortOrder: number;
}

export interface MarketplaceProfileConfig {
  id: string;
  name: string;
  displayName: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  marginType: MarginType;
  marginValue: number;
  charges: FeeCharge[];
}

export type PricingStatus =
  | "BELOW_MSP"
  | "BREAK_EVEN"
  | "HEALTHY_MARGIN"
  | "PREMIUM_MARGIN";

export interface PricingAnalysis {
  purchasePrice: number;
  marketplaceCosts: number;
  costBreakdown: Partial<Record<ChargeKey, number>>;
  msp: number;
  mrp: number;
  sellingPrice: number;
  diffVsMsp: number;
  diffVsMrp: number;
  expectedProfit: number;
  profitPct: number;
  marginPct: number;
  status: PricingStatus;
}

export interface PricingMarketplaceRow {
  marketplace: string;
  displayName: string;
  listedPrice: number;
  currency: string;
  fees: number;
  msp: number;
  mrp: number;
  profit: number;
  status: PricingStatus;
}
