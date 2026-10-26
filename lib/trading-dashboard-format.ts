export const count = (value?: number | null) => value == null ? "—" : value.toLocaleString("en-IN");
export function amount(value: number | null, currency: string | null) {
  if (value === null) return `${currency || "Foreign currency"} conversion unavailable`;
  try { return currency ? new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value) : `${value.toLocaleString("en-IN")} · currency not recorded`; }
  catch { return `${value.toLocaleString("en-IN")} ${currency || ""}`; }
}
export function timestamp(value: string) { return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
