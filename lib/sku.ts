import { Prisma } from "@prisma/client";

export async function generateSku(
  tx: Prisma.TransactionClient,
  params: {
    categoryCode: string; // e.g. LG, BD, CV
    gemType: string;
    shape: string;
    weight: number;
  }
) {
  // Normalize inputs
  // Example: KG-LG-AMETHYST-OVAL-5.25-0007
  
  const cat = params.categoryCode.toUpperCase();
  const gem = params.gemType.toUpperCase().replace(/[^A-Z0-9]/g, ""); // Remove spaces/special chars
  const shp = params.shape.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const wgt = params.weight.toFixed(2);
  
  const prefix = `KG-${cat}-${gem}-${shp}-${wgt}`;
  
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
