export const EBAY_ANALYTICS_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly";
export const EBAY_TRAFFIC_METRICS = ["LISTING_VIEWS_TOTAL", "LISTING_IMPRESSION_TOTAL"];
type Value = { value?: string | number; applicable?: boolean };
export type EbayTrafficReport = {
  header?: { dimensionKeys?: { key?: string }[]; metrics?: { key?: string }[] };
  records?: { dimensionValues?: Value[]; metricValues?: Value[] }[];
  startDate?: string; endDate?: string; lastUpdatedDate?: string;
};

export function ebayTrafficQuery(ids: string[], now = new Date()): URLSearchParams {
  const date = (daysAgo: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo)).toISOString().slice(0, 10);
  // Bare YYYYMMDD dates use eBay's Pacific timezone. Supply an explicit offset.
  return new URLSearchParams({ dimension: "LISTING", filter: `listing_ids:{${ids.join("|")}},date_range:[${date(30)}T00:00:00.000+00:00..${date(1)}T23:59:59.000+00:00]`, metric: EBAY_TRAFFIC_METRICS.join(",") });
}

export function parseEbayTraffic(report: EbayTrafficReport) {
  const listingIndex = report.header?.dimensionKeys?.findIndex((key) => key.key === "LISTING_ID") ?? -1;
  const metric = (values: Value[] | undefined, name: string) => {
    const index = report.header?.metrics?.findIndex((key) => key.key === name) ?? -1;
    const value = values?.[index];
    if (!value || value.applicable === false || value.value == null || value.value === "") return null;
    const count = Number(value.value);
    return Number.isFinite(count) && count >= 0 ? count : null;
  };
  return new Map((report.records || []).flatMap((record) => {
    const id = record.dimensionValues?.[listingIndex]?.value;
    return id == null ? [] : [[String(id), { views: metric(record.metricValues, "LISTING_VIEWS_TOTAL"), impressions: metric(record.metricValues, "LISTING_IMPRESSION_TOTAL") }] as const];
  }));
}
