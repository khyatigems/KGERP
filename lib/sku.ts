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
  const cat = params.categoryCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const gem = params.gemstoneCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const col = params.colorCode ? params.colorCode.toUpperCase().replace(/[^A-Z0-9]/g, "") : "XX";
  const wgtStr = params.weightValue.toFixed(2).replace('.', '');
  const prefix = `KG${cat}${gem}${col}${wgtStr}`;

  const sequenceRows = await tx.$queryRawUnsafe<Array<{ value: string }>>(`
    INSERT INTO "Setting" ("id", "key", "value", "description", "updatedAt")
    VALUES (
      lower(hex(randomblob(16))),
      'GLOBAL_SKU_SEQUENCE',
      '1',
      'Global running sequence number for SKU generation',
      datetime('now')
    )
    ON CONFLICT("key") DO UPDATE SET value = CAST(value AS INTEGER) + 1
    RETURNING value
  `);

  const nextSeq = Number(sequenceRows[0]?.value ?? 1);
  if (!Number.isFinite(nextSeq)) {
    throw new Error("Failed to generate SKU sequence");
  }

  const seqStr = nextSeq.toString().padStart(5, '0');
  return `${prefix}${seqStr}`;
}
