import { ensureMarketplaceControlCenterSchema, getMarketplaceDashboardData, getMarketplaceAuditMetrics } from "@/lib/marketplace-control-center";
import { ensureMarketplaceMetricsSchema, prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { AlertTriangle, Globe, ShoppingCart, Activity } from "lucide-react";
import { MarketplaceExportButton } from "@/components/marketplace-export-button";
import { MarketplaceNavButton } from "@/components/marketplace-nav-button";
import { MarketplacePriceAuditExport } from "@/components/marketplace-price-audit-export";

export const dynamic = "force-dynamic";

export default async function MarketplaceControlCenterPage({
  searchParams: _searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await ensureMarketplaceControlCenterSchema();
  const searchParams = await _searchParamsPromise;

  const categoryParam = typeof searchParams.category === "string" ? searchParams.category : "ALL";
  const marketplaceParam = typeof searchParams.marketplace === "string" ? searchParams.marketplace : "ALL";
  const fromParam = typeof searchParams.from === "string" ? searchParams.from : "";
  const toParam = typeof searchParams.to === "string" ? searchParams.to : "";
  const report = typeof searchParams.report === "string" ? searchParams.report : "";
  const sortBy = typeof searchParams.sortBy === "string" ? searchParams.sortBy : "opportunity";

  const data = await getMarketplaceDashboardData({
    category: categoryParam,
    marketplace: marketplaceParam,
    from: fromParam || undefined,
    to: toParam || undefined,
  });

  const audit = await getMarketplaceAuditMetrics(86);

  await ensureMarketplaceMetricsSchema();

  const categories = await prisma.$queryRawUnsafe<Array<{ category: string | null }>>(
    `SELECT DISTINCT "category" FROM "Inventory" WHERE "category" IS NOT NULL AND "category" <> '' ORDER BY "category" LIMIT 200`
  );

  const coverageRows = data.rows;
  const inventoryIds = coverageRows.map((r) => r.inventoryId);
  let engagementRows: Array<{
    inventoryId: string;
    marketplace: string;
    externalId: string | null;
    currentViews: number;
    currentWatches: number;
    currentFavourites: number;
    viewsDelta7d: number;
    watchesDelta7d: number;
    trendScore: number;
    isListed: boolean;
    isInStock: boolean;
    lastSnapshotAt: Date | null;
  }> = [];
  if (inventoryIds.length) {
    try {
      engagementRows = await prisma.listingOpportunity.findMany({
        where: { inventoryId: { in: inventoryIds } },
        orderBy: { trendScore: "desc" }
      });
    } catch (e) {
      console.warn("[opportunity] listingOpportunity query failed, table may not exist yet:", (e as Error).message);
      engagementRows = [];
    }
  }
  const engagementById = new Map(engagementRows.map((e) => [e.inventoryId, e]));

  const enrichedRows = coverageRows.map((r) => {
    const e = engagementById.get(r.inventoryId);
    const engagementScore = e?.trendScore ?? 0;
    const views = e?.currentViews ?? 0;
    const watches = e?.currentWatches ?? 0;
    const favourites = e?.currentFavourites ?? 0;
    const delta7d = e?.viewsDelta7d ?? 0;
    const tier = engagementScore >= 70 ? "hot" : engagementScore >= 40 ? "warm" : engagementScore > 0 ? "cold" : null;
    return { ...r, engagementScore, views, watches, favourites, delta7d, tier };
  });

  const opportunityRows = [...enrichedRows]
    .filter((r) => r.missingPlatforms.length > 0 && r.readyToList)
    .sort((a, b) => {
      if (sortBy === "engagement") return b.engagementScore - a.engagementScore || b.opportunityScore - a.opportunityScore;
      return b.opportunityScore - a.opportunityScore;
    });
  const needsPreparationRows = [...enrichedRows]
    .filter((r) => r.missingPlatforms.length > 0 && !r.readyToList)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  function formatDate(raw: string | null | undefined): string {
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs">🔥 Hot engagement</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{enrichedRows.filter((r) => r.tier === "hot").length}</div>
                <div className="text-[10px] text-muted-foreground">Score ≥ 70, ready to list</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs">🟡 Warm</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{enrichedRows.filter((r) => r.tier === "warm").length}</div>
                <div className="text-[10px] text-muted-foreground">Score 40–69</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs">Coverage gap</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opportunityRows.length}</div>
                <div className="text-[10px] text-muted-foreground">SKUs with missing marketplaces</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs">With engagement</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrichedRows.filter((r) => r.engagementScore > 0).length}</div>
                <div className="text-[10px] text-muted-foreground">Synced from extension</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sortBy !== "opportunity" ? (
              <MarketplaceNavButton href="/marketplace-control-center?report=opportunity&sortBy=opportunity" size="sm" variant="outline">
                Sort by coverage gap
              </MarketplaceNavButton>
            ) : (
              <MarketplaceNavButton href="/marketplace-control-center?report=opportunity&sortBy=engagement" size="sm" variant="default">
                Sort by engagement (views/watches)
              </MarketplaceNavButton>
            )}
            {sortBy === "engagement" ? (
              <span className="text-xs text-muted-foreground">
                Synced from extension engagement data
              </span>
            ) : null}
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Current Marketplaces</TableHead>
                  <TableHead>Missing Marketplaces</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Watches</TableHead>
                  <TableHead className="text-right">Fav</TableHead>
                  <TableHead className="text-right">Δ7d</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Ready</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunityRows.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center h-24 text-muted-foreground">No opportunities found</TableCell></TableRow>
                ) : (
                  opportunityRows.slice(0, 200).map((row) => (
                    <TableRow key={row.inventoryId}>
                      <TableCell className="font-medium">{row.sku}</TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>
                        {row.platforms.length === 0 ? "None" : (
                          <div className="flex flex-wrap gap-1">
                            {row.platforms.map((p) => (
                              <Badge key={p} variant="default" className="text-[10px]">
                                {p}{row.lastListedDates?.[p] ? ` ${formatDate(row.lastListedDates[p])}` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.missingPlatforms.length === 0 ? "None" : (
                          <div className="flex flex-wrap gap-1">
                            {row.missingPlatforms.map((p) => (
                              <a key={p} href={`/inventory/${row.inventoryId}`} target="_blank" rel="noopener noreferrer">
                                <Badge variant="outline" className="cursor-pointer hover:bg-accent text-[10px]">{p}</Badge>
                              </a>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.views || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.watches || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.favourites || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className={`text-right tabular-nums ${row.delta7d > 0 ? "text-emerald-600" : row.delta7d < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {row.delta7d === 0 ? "—" : (row.delta7d > 0 ? "+" : "") + row.delta7d}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.engagementScore > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold tabular-nums">{Math.round(row.engagementScore)}</span>
                            <Badge
                              variant={row.tier === "hot" ? "destructive" : row.tier === "warm" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {row.tier === "hot" ? "🔥 Hot" : row.tier === "warm" ? "Warm" : "Cold"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.opportunityScore >= 2 ? "destructive" : "secondary"}>
                          {row.opportunityScore} Missing
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.platforms.length > 0 ? (
                          <Badge variant="default" className="bg-emerald-500 text-[10px]">Listed</Badge>
                        ) : row.readyToList ? (
                          <Badge variant="default" className="text-[10px]">✅ Ready</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px]">⚠️ Needs Prep</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
