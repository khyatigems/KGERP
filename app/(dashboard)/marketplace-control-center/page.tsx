import { ensureMarketplaceControlCenterSchema, getMarketplaceDashboardData, getMarketplaceAuditMetrics, MarketplacePortfolioRow, MarketplacePlatform } from "@/lib/marketplace-control-center";
import { ensureMarketplaceMetricsSchema, prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Globe, ShoppingCart, Activity } from "lucide-react";
import { MarketplaceExportButton } from "@/components/marketplace-export-button";
import { MarketplaceNavButton } from "@/components/marketplace-nav-button";
import { MarketplacePriceAuditExport } from "@/components/marketplace-price-audit-export";
import { AnimatedPage } from "@/components/ui/animated-page";
import { analyzePricing, resolvePurchaseCost } from "@/lib/pricing/engine";
import { getCurrencyRates, getDefaultProfile, getProfiles, isPricingEngineEnabled } from "@/lib/pricing/db";
import { toInr } from "@/lib/pricing/currency";
import type { MarketplaceProfileConfig, PricingAnalysis } from "@/lib/pricing/types";
import { OpportunityReportTable, OpportunityReportRowPayload } from "@/components/opportunity-report-table";

export const dynamic = "force-dynamic";

export default async function MarketplaceControlCenterPage({
  searchParams: _searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const permissionCheck = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permissionCheck.success) {
    redirect("/");
  }

  await ensureMarketplaceControlCenterSchema();
  const searchParams = await _searchParamsPromise;

  const categoryParam = typeof searchParams.category === "string" ? searchParams.category : "ALL";
  const marketplaceParam = typeof searchParams.marketplace === "string" ? searchParams.marketplace : "ALL";
  const fromParam = typeof searchParams.from === "string" ? searchParams.from : "";
  const toParam = typeof searchParams.to === "string" ? searchParams.to : "";
  const report = typeof searchParams.report === "string" ? searchParams.report : "";
  const sortBy = typeof searchParams.sortBy === "string" ? searchParams.sortBy : "opportunity";
  // sortBy param kept for backward compat with old links; only "opportunity" is used now

  const data = await getMarketplaceDashboardData({
    category: categoryParam,
    marketplace: marketplaceParam,
    from: fromParam || undefined,
    to: toParam || undefined,
  });

  const audit = await getMarketplaceAuditMetrics();

  await ensureMarketplaceMetricsSchema();

  // Pricing analysis data (Opportunity Report)
  const pricingEnabled = await isPricingEngineEnabled();
  const defaultProfile = await getDefaultProfile();
  const allProfiles = await getProfiles();
  const rates = await getCurrencyRates();
  const profileByName = new Map<string, MarketplaceProfileConfig>(
    allProfiles.map((p) => [p.name, p])
  );

  function analyzeRow(row: MarketplacePortfolioRow, sellingPrice: number, profile?: MarketplaceProfileConfig): PricingAnalysis | null {
    if (!profile) return null;
    const purchasePrice = resolvePurchaseCost(row);
    return analyzePricing({
      purchasePrice,
      sellingPrice,
      charges: profile.charges,
      marginType: profile.marginType,
      marginValue: profile.marginValue,
    });
  }

  function perMarketplaceRows(row: MarketplacePortfolioRow): Array<{ platform: MarketplacePlatform; analysis: PricingAnalysis; listedPriceInr: number }> {
    if (!pricingEnabled) return [];
    const out: Array<{ platform: MarketplacePlatform; analysis: PricingAnalysis; listedPriceInr: number }> = [];
    for (const platform of row.platforms) {
      const profile = profileByName.get(platform);
      const listed = row.marketplacePrices[platform];
      if (!profile || listed == null) continue;
      const listedInr = toInr(listed, row.marketplaceCurrencies[platform] || profile.currency, rates);
      const finalPrice = Number.isFinite(listedInr) ? listedInr : Number(listed);
      const analysis = analyzeRow(row, finalPrice, profile);
      if (analysis) out.push({ platform, analysis, listedPriceInr: finalPrice });
    }
    return out;
  }

  const categories = await prisma.$queryRawUnsafe<Array<{ category: string | null }>>(
    `SELECT DISTINCT "category" FROM "Inventory" WHERE "category" IS NOT NULL AND "category" <> '' ORDER BY "category" LIMIT 200`
  );

  const coverageRows = data.rows;

  const opportunityRows = [...coverageRows]
    .filter((r) => r.missingPlatforms.length > 0 && r.readyToList)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
  const needsPreparationRows = [...coverageRows]
    .filter((r) => r.missingPlatforms.length > 0 && !r.readyToList)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const belowMspCount = pricingEnabled
    ? opportunityRows.filter((r) => {
        const a = analyzeRow(r, r.sellingPrice || 0, defaultProfile);
        return a?.status === "BELOW_MSP";
      }).length
    : 0;

  const opportunityPayload: OpportunityReportRowPayload[] = opportunityRows
    .slice(0, 200)
    .map((row) => ({
      row,
      analysis: pricingEnabled ? analyzeRow(row, row.sellingPrice || 0, defaultProfile) : null,
      perMp: perMarketplaceRows(row),
    }));

  function formatDate(raw: string | null | undefined): string {
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
    <AnimatedPage>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Marketplace Control Center</h1>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get" action="/marketplace-control-center">
        {report ? <input type="hidden" name="report" value={report} /> : null}
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">Category</div>
          <select name="category" defaultValue={categoryParam} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={String(c.category)} value={String(c.category)}>{String(c.category)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">Marketplace</div>
          <select name="marketplace" defaultValue={marketplaceParam} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="ALL">All Marketplaces</option>
            <option value="EBAY">eBay</option>
            <option value="ETSY">Etsy</option>
            <option value="AMAZON">Amazon</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">From</div>
          <input name="from" defaultValue={fromParam} type="date" className="h-9 rounded-md border bg-background px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">To</div>
          <input name="to" defaultValue={toParam} type="date" className="h-9 rounded-md border bg-background px-3 text-sm" />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">Apply Filters</Button>
      </form>

      {!report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  Active Marketplace Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalListings}</div>
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <div>eBay: {data.platformCounts.EBAY}</div>
                  <div>Etsy: {data.platformCounts.ETSY}</div>
                  <div>Amazon: {data.platformCounts.AMAZON}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Marketplace Pricing Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1">
                    <Badge variant="destructive" className="text-[10px]">Critical</Badge>
                    <span className="text-xs">Listings below ERP Selling Price</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Warning</Badge>
                    <span className="text-xs">Listings below margin threshold</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">Opportunity</Badge>
                    <span className="text-xs">Marketplace price exceeds ERP by 15%+</span>
          </div>

          {needsPreparationRows.length > 0 && (
            <div className="space-y-2 mt-6">
              <h3 className="text-lg font-semibold text-amber-600">⚠️ Needs Preparation ({needsPreparationRows.length})</h3>
              <p className="text-xs text-muted-foreground">These items are not listed on any platform and need image + certificate before listing.</p>
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Missing</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsPreparationRows.slice(0, 50).map((row) => (
                      <TableRow key={row.inventoryId}>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.missingPlatforms.map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.hasImage ? <Badge variant="default" className="bg-emerald-500 text-[10px]">✅</Badge> : <Badge variant="destructive" className="text-[10px]">Missing</Badge>}
                        </TableCell>
                        <TableCell>
                          {row.hasCertificate ? <Badge variant="default" className="bg-emerald-500 text-[10px]">✅</Badge> : <Badge variant="destructive" className="text-[10px]">Missing</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  Marketplace Coverage Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="flex justify-between"><span>eBay Only</span><span>{data.coverageSummary.eBayOnly}</span></div>
                <div className="flex justify-between"><span>Etsy Only</span><span>{data.coverageSummary.etsyOnly}</span></div>
                <div className="flex justify-between"><span>Amazon Only</span><span>{data.coverageSummary.amazonOnly}</span></div>
                <div className="flex justify-between"><span>eBay + Etsy</span><span>{data.coverageSummary.ebayEtsy}</span></div>
                <div className="flex justify-between"><span>eBay + Amazon</span><span>{data.coverageSummary.ebayAmazon}</span></div>
                <div className="flex justify-between"><span>Etsy + Amazon</span><span>{data.coverageSummary.etsyAmazon}</span></div>
                <div className="flex justify-between"><span>All Platforms</span><span>{data.coverageSummary.allPlatforms}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  Recent Marketplace Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.recentActivity.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No recent activity</div>
                ) : (
                  data.recentActivity.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 pb-2 border-b last:border-0">
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">{a.actionType}</Badge>
                      <div className="text-xs flex-1 min-w-0">
                        <div className="truncate">{a.details || a.actionType}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {a.userName || "System"}
                          {a.createdAt ? ` · ${formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Revenue Leakage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{audit.revenueLeakage.toLocaleString("en-IN")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {audit.affectedLeakageCount} affected · Largest: ₹{audit.largestLeakage.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Margin Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Below 100%</span>
                    <span className="font-bold">{audit.redCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> 100–300%</span>
                    <span className="font-bold">{audit.amberCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Above 300%</span>
                    <span className="font-bold">{audit.greenCount}</span>
                  </div>
                  <div className="text-muted-foreground pt-1">Avg: {audit.avgMargin}%</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600">Best Marketplace</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{audit.bestPlatform}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Profit: ₹{audit.bestPlatformProfit.toLocaleString("en-IN")}<br />
                  Margin: {audit.bestPlatformMargin}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Critical Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{audit.priceAlerts}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {audit.lowMargin} low margin · {audit.priceAlerts} price alerts
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4">
            <MarketplaceNavButton href="/marketplace-conflicts">
              View All Conflicts
            </MarketplaceNavButton>
            <MarketplaceNavButton href="/marketplace-control-center?report=coverage">
              Coverage Report
            </MarketplaceNavButton>
            <MarketplaceNavButton href="/marketplace-control-center?report=opportunity">
              Opportunity Report
            </MarketplaceNavButton>
            <MarketplacePriceAuditExport />
          </div>
        </>
      ) : report === "coverage" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Marketplace Coverage Report</h2>
            <div className="flex items-center gap-2">
              <MarketplaceExportButton href={`/api/marketplace/export?report=coverage&category=${categoryParam}&marketplace=${marketplaceParam}&from=${fromParam}&to=${toParam}`} />
              <MarketplaceNavButton href="/marketplace-control-center" variant="ghost" size="sm">
                Back to Dashboard
              </MarketplaceNavButton>
            </div>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>eBay</TableHead>
                  <TableHead>Etsy</TableHead>
                  <TableHead>Amazon</TableHead>
                  <TableHead>Coverage %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coverageRows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No products found</TableCell></TableRow>
                ) : (
                  coverageRows.slice(0, 200).map((row) => {
                    const platformBadge = (platform: "EBAY" | "ETSY" | "AMAZON") => {
                      const hasListing = row.platforms.includes(platform);
                      const lastDate = row.lastListedDates?.[platform];
                      if (hasListing) {
                        return (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="default" className="w-fit">Yes</Badge>
                            {lastDate && <span className="text-[10px] text-muted-foreground">{formatDate(lastDate)}</span>}
                          </div>
                        );
                      }
                      return (
                        <a href={`/inventory/${row.inventoryId}`} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer hover:bg-accent">Add Listing</Badge>
                        </a>
                      );
                    };
                    return (
                      <TableRow key={row.inventoryId}>
                        <TableCell className="font-medium">{row.sku}</TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell>{platformBadge("EBAY")}</TableCell>
                        <TableCell>{platformBadge("ETSY")}</TableCell>
                        <TableCell>{platformBadge("AMAZON")}</TableCell>
                        <TableCell>{row.coveragePercent}%</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : report === "opportunity" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Marketplace Opportunity Report</h2>
            <div className="flex items-center gap-2">
              <MarketplaceExportButton href={`/api/marketplace/export?report=opportunity&category=${categoryParam}&marketplace=${marketplaceParam}&from=${fromParam}&to=${toParam}`} />
              <MarketplaceNavButton href="/marketplace-control-center" variant="ghost" size="sm">
                Back to Dashboard
              </MarketplaceNavButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs">Coverage gap</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opportunityRows.length}</div>
                <div className="text-[10px] text-muted-foreground">SKUs with missing marketplaces</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs">Out of stock</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{data.rows.filter((r) => r.inventoryStatus === "OUT_OF_STOCK" || r.inventoryStatus === "SOLD_OUT").length}</div>
                <div className="text-[10px] text-muted-foreground">Cannot list</div>
              </CardContent>
            </Card>
            {pricingEnabled ? (
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs">Below MSP</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{belowMspCount}</div>
                  <div className="text-[10px] text-muted-foreground">Listed below minimum profitable price</div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-1"><CardTitle className="text-xs">Not listed</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.rows.filter((r) => r.platforms.length === 0).length}</div>
                  <div className="text-[10px] text-muted-foreground">High supply gap</div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Showing SKUs that need listing on at least one platform
            </span>
            {pricingEnabled && defaultProfile ? (
              <Badge variant="outline" className="text-[10px]">
                Default pricing basis: {defaultProfile.displayName}
              </Badge>
            ) : null}
          </div>

          <OpportunityReportTable
            rows={opportunityPayload}
            pricingEnabled={pricingEnabled}
          />
        </div>
      ) : null}
    </div>
    </AnimatedPage>
  );
}
