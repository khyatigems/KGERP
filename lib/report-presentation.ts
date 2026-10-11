import { Boxes, Timer, Tags, FileCheck2, Images, RefreshCw, TrendingUp, BarChart3, Award, Hourglass, FileText, ChartNoAxesCombined, ReceiptIndianRupee, WalletCards, Landmark, CreditCard, ArrowDownToLine, Wallet, Clock4, CircleDollarSign, Truck, PackageSearch, Network, UserRoundSearch, Crown, History, Gift, BadgePercent, Workflow, Printer, QrCode, UserRoundCog, ScrollText, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  inventory: Boxes, "inventory-aging": Timer, "category-stock": Tags,
  "certificate-readiness": FileCheck2, "missing-media": Images, "capital-rotation": RefreshCw,
  sales: TrendingUp, "turnover-report": BarChart3, "top-categories": Award,
  "sales-cycle": Hourglass, quotations: FileText, profit: ChartNoAxesCombined,
  invoices: ReceiptIndianRupee, payments: WalletCards, gst: Landmark,
  receivables: CreditCard, "export-payments": ArrowDownToLine,
  "customer-advances": Wallet, "pending-advances": Clock4, "advance-utilization": CircleDollarSign,
  "vendor-purchases": Truck, "vendor-inventory": PackageSearch, "vendor-dependency": Network,
  "customer-intelligence": UserRoundSearch, "top-customers": Crown, "purchase-timeline": History,
  "loyalty-points": Gift, "discount-usage": BadgePercent, ops: Workflow,
  "label-printing": Printer, "qr-scans": QrCode, "user-activity": UserRoundCog, "system-logs": ScrollText,
};
const colors: Record<string, string> = {
  Inventory: "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/20",
  "Sales & quotations": "bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/20",
  "Finance & payments": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  Suppliers: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/20",
  "Customers & loyalty": "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/20",
  Operations: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20",
};
export function reportPresentation(href: string, group: string) {
  return { Icon: icons[href.split("/").pop() || ""] || BarChart3, color: colors[group] || colors.Operations };
}
