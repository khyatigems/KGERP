export type AttentionWidgetData<
  TMemo extends { id: string; inventory: { sku: string } } = { id: string; inventory: { sku: string } },
  TUnsold extends { id: string; sku: string } = { id: string; sku: string },
  TMissingCert extends { id: string; sku: string } = { id: string; sku: string },
  TMissingImage extends { id: string; sku: string } = { id: string; sku: string },
  THighValueUnsold extends { id: string; sku: string } = { id: string; sku: string }
> = {
  quotations: Array<{ id: string }>;
  invoices: Array<{ id: string }>;
  memo: Array<TMemo>;
  vendors: number;
  unsold?: Array<TUnsold>;
  missingCertifications?: Array<TMissingCert>;
  missingImages?: Array<TMissingImage>;
  pendingExpenses?: Array<{ id: string }>;
  highValueUnsold?: Array<THighValueUnsold>;
};

export function applyAttentionVisibilityFilters<
  TMemo extends { id: string; inventory: { sku: string } },
  TUnsold extends { id: string; sku: string },
  TMissingCert extends { id: string; sku: string },
  TMissingImage extends { id: string; sku: string },
  THighValueUnsold extends { id: string; sku: string }
>(
  data: AttentionWidgetData<TMemo, TUnsold, TMissingCert, TMissingImage, THighValueUnsold>,
  options: {
    hideMissingCertifications: boolean;
    hideMissingImages: boolean;
    runtimeHiddenSkuIds?: Set<string>;
  }
) {
  const hiddenSkuIds = options.runtimeHiddenSkuIds || new Set<string>();
  const skuVisible = (sku: string) => !hiddenSkuIds.has(sku);

  const missingCertifications = options.hideMissingCertifications
    ? []
    : (data.missingCertifications || []).filter((item) => skuVisible(item.sku));
  const missingImages = options.hideMissingImages
    ? []
    : (data.missingImages || []).filter((item) => skuVisible(item.sku));
  const unsold = (data.unsold || []).filter((item) => skuVisible(item.sku));
  const highValueUnsold = (data.highValueUnsold || []).filter((item) => skuVisible(item.sku));
  const memo = (data.memo || []).filter((item) => skuVisible(item.inventory?.sku || ""));

  const hasItems =
    data.quotations.length > 0 ||
    data.invoices.length > 0 ||
    memo.length > 0 ||
    data.vendors > 0 ||
    unsold.length > 0 ||
    missingCertifications.length > 0 ||
    missingImages.length > 0 ||
    (data.pendingExpenses && data.pendingExpenses.length > 0) ||
    highValueUnsold.length > 0;

  return {
    missingCertifications,
    missingImages,
    unsold,
    highValueUnsold,
    memo,
    hasItems
  };
}
