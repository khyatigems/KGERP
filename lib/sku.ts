import { Prisma } from "@prisma/client";

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
  // Example: KG-LG-RBY-RED-5.25-0007
  
  const cat = params.categoryCode.toUpperCase();
  const gem = params.gemstoneCode.toUpperCase().replace(/[^A-Z0-9]/g, ""); 
  const col = params.colorCode ? params.colorCode.toUpperCase().replace(/[^A-Z0-9]/g, "") : "XX";
  
  // Format weight: 5.25
  const wgt = params.weightValue.toFixed(2);
  
  const prefix = `KG-${cat}-${gem}-${col}-${wgt}`;
  
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
    const parts = lastItem.sku.split('-');
    const lastSeqStr = parts[parts.length - 1];
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  const seqStr = seq.toString().padStart(4, '0');
  return `${prefix}-${seqStr}`;
}
