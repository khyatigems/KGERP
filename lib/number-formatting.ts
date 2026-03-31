const SPACE_CHARS = /[\s\u00A0\u1680\u180E\u2000-\u200F\u2028\u2029\u202F\u205F\u3000\uFEFF]/g;

const INR_2DP = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INR_0DP = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function sanitizeNumberText(input: string) {
  return input.replace(SPACE_CHARS, "");
}

export function formatInrNumber(value: number, decimals: 0 | 2) {
  const base = decimals === 0 ? INR_0DP.format(value) : INR_2DP.format(value);
  return sanitizeNumberText(base);
}

export function formatInrValue(value: unknown) {
  if (typeof value === "number") return formatInrNumber(value, 2);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return formatInrNumber(Number(trimmed), 2);
    return sanitizeNumberText(trimmed);
  }
  return formatInrNumber(0, 2);
}

export function formatInrCurrency(value: unknown) {
  return `₹${formatInrValue(value)}`;
}

export function isValidHttpUrl(value: unknown) {
  if (typeof value !== "string") return false;
  const input = value.trim();
  if (!input) return false;
  const candidate = input.startsWith("www.") ? `https://${input}` : input;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeCertificateUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input) return null;

  const hasScheme = /^[a-zA-Z][\w+.-]*:/.test(input);
  const candidate = (() => {
    if (hasScheme) return input;
    if (input.startsWith("//")) return `https:${input}`;
    const normalized = input.startsWith("www.") ? `https://${input}` : `https://${input}`;
    return normalized;
  })();

  if (!isValidHttpUrl(candidate)) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    if (!url.hostname.includes(".")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

