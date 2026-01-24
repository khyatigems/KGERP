import { Prisma } from "@prisma/client-custom-v2";

export function formatCaratWeight(weightValue: number, weightUnit: string) {
  let carat = weightValue;
  if (weightUnit === "gms") {
    carat = weightValue * 5;
  }
  return carat.toFixed(2);
}

export async function generateSku(
  tx: Prisma.TransactionClient,
  params: {
    categoryCode: string; // e.g. LG, BD, CV
    gemstoneCode: string; // e.g. RBY, SAP
    colorCode?: string; // e.g. RED, BLU
    weightValue: number;
    weightUnit: string;
  }
) {
  // Normalize inputs
  // Example: KGLGSAPRED5250007 (Weight 5.25)
  
  const cat = params.categoryCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const gem = params.gemstoneCode.toUpperCase().replace(/[^A-Z0-9]/g, ""); 
  const col = params.colorCode ? params.colorCode.toUpperCase().replace(/[^A-Z0-9]/g, "") : "XX";
  
  // Format weight: 5.25 -> 525, 0.50 -> 050, 0.00 -> 000
  const wgtStr = params.weightValue.toFixed(2).replace('.', '');
  
  const prefix = `KG${cat}${gem}${col}${wgtStr}`;
  
  // Find last SKU starting with this prefix
  const lastItem = await tx.inventory.findFirst({
    where: {
      sku: {
        startsWith: prefix
      }
    },
    orderBy: {
      sku: 'desc'
    }
  });

  let seq = 1;
  if (lastItem) {
    // KGLGSAPRED5250007
    // The prefix length varies (due to weight).
    // But we know the prefix we generated.
    // The suffix is the last 4 chars?
    // "KG + ... + SERIAL"
    // We should extract the part after the prefix.
    const suffix = lastItem.sku.slice(prefix.length);
    // Ensure suffix is numeric
    if (/^\d+$/.test(suffix)) {
        seq = parseInt(suffix, 10) + 1;
    }
  }

  const seqStr = seq.toString().padStart(4, '0');
  return `${prefix}${seqStr}`;
}
