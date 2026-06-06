import { ensureMarketplaceControlCenterSchema, getMarketplaceDashboardData } from "@/lib/marketplace-control-center";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { AlertTriangle, Globe, ShoppingCart, Activity } from "lucide-react";
import { MarketplaceExportButton } from "@/components/marketplace-export-button";

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

  const categories = await prisma.$queryRawUnsafe<Array<{ category: string | null }>>(
    `SELECT DISTINCT "category" FROM "Inventory" WHERE "category" IS NOT NULL AND "category" <> '' ORDER BY "category" LIMIT 200`
  );

  const coverageRows = data.rows;
  const opportunityRows = [...coverageRows].filter((r) => r.opportunityScore > 0);
  if (sortBy === "opportunity") {
    opportunityRows.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

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
                  Inventory Conflicts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-bold text-orange-500">{data.conflictCounts.Pending}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolved</span>
                    <span className="font-bold text-green-600">{data.conflictCounts.Resolved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical</span>
                    <span className="font-bold text-red-600">{data.criticalConflicts}</span>
                  </div>
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

          <div className="flex items-center gap-4">
            <Link href="/marketplace-conflicts">
              <Button variant="outline">View All Conflicts</Button>
            </Link>
            <Link href="/marketplace-control-center?report=coverage">
              <Button variant="outline">Coverage Report</Button>
            </Link>
            <Link href="/marketplace-control-center?report=opportunity">
              <Button variant="outline">Opportunity Report</Button>
            </Link>
          </div>
        </>
      ) : report === "coverage" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Marketplace Coverage Report</h2>
            <div className="flex items-center gap-2">
              <MarketplaceExportButton href={`/api/marketplace/export?report=coverage&category=${categoryParam}&marketplace=${marketplaceParam}&from=${fromParam}&to=${toParam}`} />
              <Link href="/marketplace-control-center">
                <Button variant="ghost" size="sm">Back to Dashboard</Button>
              </Link>
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
              <Link href="/marketplace-control-center">
                <Button variant="ghost" size="sm">Back to Dashboard</Button>
              </Link>
            </div>
          </div>

          {sortBy !== "opportunity" ? (
            <Link href="/marketplace-control-center?report=opportunity&sortBy=opportunity">
              <Button variant="outline" size="sm">Sort by Highest Opportunity First</Button>
            </Link>
          ) : null}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Current Marketplaces</TableHead>
                  <TableHead>Missing Marketplaces</TableHead>
                  <TableHead>Opportunity Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunityRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No opportunities found</TableCell></TableRow>
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
                      <TableCell>
                        <Badge variant={row.opportunityScore >= 2 ? "destructive" : "secondary"}>
                          {row.opportunityScore} Missing
                        </Badge>
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
