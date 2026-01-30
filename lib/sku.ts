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
  
  // GLOBAL SEQUENCE LOGIC
  // Instead of finding the last SKU with the same prefix, we use a global counter stored in Settings.
  // Key: "GLOBAL_SKU_SEQUENCE"
  
  // 1. Get or Initialize Global Sequence
  let currentSeq = 0;
  
  const setting = await tx.setting.findUnique({
    where: { key: "GLOBAL_SKU_SEQUENCE" }
  });

  if (setting) {
    currentSeq = parseInt(setting.value, 10);
  } else {
    // If not exists, check DB for max SKU suffix? 
    // Risky if format changed. Safer to start at 1 or seeded value.
    // Or we can try to find the max existing SKU ending in digits?
    // Let's default to 0 for fresh start or manual migration.
    currentSeq = 0;
  }

  // 2. Increment Sequence
  const nextSeq = currentSeq + 1;

  // 3. Update Setting
  await tx.setting.upsert({
    where: { key: "GLOBAL_SKU_SEQUENCE" },
    update: { value: nextSeq.toString() },
    create: { 
      key: "GLOBAL_SKU_SEQUENCE", 
      value: nextSeq.toString(),
      description: "Global running sequence number for SKU generation" 
    }
  });

  // 4. Format Suffix (5 digits: 00001)
  const seqStr = nextSeq.toString().padStart(5, '0');
  
  return `${prefix}${seqStr}`;
}
