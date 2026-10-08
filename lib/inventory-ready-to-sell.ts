import type { Prisma } from "@prisma/client";

export function buildReadyToSellWhere(): Prisma.InventoryWhereInput {
  return {
    status: "IN_STOCK",
    AND: [
      {
        OR: [
          { imageUrl: { not: null } },
          { media: { some: { type: "IMAGE" } } },
        ],
      },
      {
        OR: [
          { certificateNo: { not: "" } },
          { certificateNumber: { not: "" } },
        ],
      },
      { description: { not: "" } },
      { hsnCode: { not: "" } },
    ],
  };
}
