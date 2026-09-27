import { prisma } from "@/lib/prisma";

const PURCHASE_PREFIX = "KGP-";

function extractNumericSuffix(value: string, prefix: string) {
  const raw = (value || "").trim();
  if (prefix && !raw.toLowerCase().startsWith(prefix.toLowerCase())) return 0;
  const suffix = prefix ? raw.slice(prefix.length).trim() : raw;
  const match = suffix.match(/(\d+)\s*$/);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getNextPurchaseNumber() {
  const existing = await prisma.purchase.findMany({
    select: {
      invoiceNo: true,
    },
  });

  const prefix = PURCHASE_PREFIX;
  const matchingExisting = existing.filter((row) =>
    row.invoiceNo?.toLowerCase().startsWith(prefix.toLowerCase())
  );

  let maxNumber = 0;
  for (const row of matchingExisting.length > 0 ? matchingExisting : existing) {
    const nextValue = extractNumericSuffix(row.invoiceNo || "", prefix);
    if (nextValue > maxNumber) maxNumber = nextValue;
  }

  const nextSequence = maxNumber + 1;
  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}
