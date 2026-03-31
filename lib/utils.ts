import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function computeWeightGrams(inv: { weightGrams?: number | null; weightUnit?: string | null; weightValue?: number | null }) {
  if (inv.weightGrams !== null && inv.weightGrams !== undefined && inv.weightGrams > 0) return inv.weightGrams;
  
  const unit = (inv.weightUnit || "").trim().toLowerCase();
  const value = inv.weightValue ?? 0;
  
  if (!value) return 0;
  
  // Explicit Grams
  if (["grams", "gram", "g", "gms", "gm", "gr"].includes(unit)) {
    return value;
  }
  
  // Explicit Carats or Default (assume Carats if unknown/missing)
  // 1 Carat = 0.2 Grams
  return value * 0.2;
}

export function normalizeDateToUtcNoon(date: Date | string): Date {
  const d = new Date(date);
  // Set time to noon UTC to avoid timezone issues
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0));
}
