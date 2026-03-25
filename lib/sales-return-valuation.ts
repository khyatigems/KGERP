export function valuationDelta({ sellingPrice, costPrice }: { sellingPrice: number; costPrice: number }) {
  const sp = Number(sellingPrice || 0);
  const cp = Number(costPrice || 0);
  return {
    delta: Math.round((sp - cp) * 100) / 100,
    sellingPrice: sp,
    costPrice: cp,
  };
}

