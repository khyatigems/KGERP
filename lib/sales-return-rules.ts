export function computeReturnStockPlacement(input: { daysSinceInvoice: number; resaleable: boolean }) {
  const withinWindow = input.daysSinceInvoice <= 7;
  const toShop = withinWindow && input.resaleable;
  return {
    status: "IN_STOCK" as const,
    stockLocation: toShop ? "SHOP" : "HOLD",
  };
}

