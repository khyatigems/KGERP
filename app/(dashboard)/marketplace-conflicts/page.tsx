import { ensureMarketplaceControlCenterSchema, getMarketplaceConflictRows, getMarketplaceConflictListingMap } from "@/lib/marketplace-control-center";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MarketplaceConflictActions } from "@/components/marketplace-conflict-actions";
import { markMarketplaceConflictResolved } from "@/app/(dashboard)/marketplace-conflicts/actions";
import { MarketplaceNavButton } from "@/components/marketplace-nav-button";
import Link from "next/link";
import { Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketplaceConflictsPage({
  searchParams: _searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await ensureMarketplaceControlCenterSchema();
  const searchParams = await _searchParamsPromise;

  const statusParam = typeof searchParams.status === "string" ? searchParams.status : "ALL";
  const skuParam = typeof searchParams.sku === "string" ? searchParams.sku : "";
  const pageParam = Number(searchParams.page) || 1;

  const { rows: conflicts, total, page, limit } = await getMarketplaceConflictRows({
    status: statusParam,
    sku: skuParam || undefined,
    page: pageParam,
    limit: 50,
  });

  const inventoryIds = conflicts.map((c) => c.inventoryId);
  const listingMap = await getMarketplaceConflictListingMap(inventoryIds);

  const totalPages = Math.ceil(total / limit);

  function formatDate(raw: string | null): string {
    if (!raw) return "-";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : formatDistanceToNow(d, { addSuffix: true });
  }

  function parsePlatforms(value: string): string[] {
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Marketplace Conflicts</h1>
        <MarketplaceNavButton href="/marketplace-control-center" variant="ghost" size="sm">
          Back to Control Center
        </MarketplaceNavButton>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get" action="/marketplace-conflicts">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">Status</div>
          <select name="status" defaultValue={statusParam} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="ALL">All</option>
            <option value="Pending">Pending</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">Search SKU / Product</div>
          <input name="sku" defaultValue={skuParam} placeholder="Search..." className="h-9 rounded-md border bg-background px-3 text-sm w-60" />
        </div>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Sold Date</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Active Platforms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conflicts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No conflicts found</TableCell>
              </TableRow>
            ) : (
              conflicts.map((conflict) => {
                const platforms = parsePlatforms(conflict.activePlatforms);
                const urls = listingMap.get(conflict.inventoryId) || { EBAY: [], ETSY: [], AMAZON: [] };
                return (
                  <TableRow key={conflict.id}>
                    <TableCell className="font-medium">
                      <Link href={`/inventory/${conflict.inventoryId}`} className="hover:underline">{conflict.sku}</Link>
                    </TableCell>
                    <TableCell>{conflict.productName}</TableCell>
                    <TableCell className="text-sm">{formatDate(conflict.soldDate)}</TableCell>
                    <TableCell>{conflict.currentQuantity}</TableCell>
                    <TableCell>
                      {platforms.length === 0 ? "-" : platforms.join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        conflict.conflictStatus === "Pending" ? "destructive" :
                        conflict.conflictStatus === "Reviewed" ? "secondary" : "default"
                      }>
                        {conflict.conflictStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(conflict.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <MarketplaceConflictActions listingUrls={urls as { EBAY?: string[]; ETSY?: string[]; AMAZON?: string[] }} />
                        {conflict.conflictStatus !== "Resolved" ? (
                          <form action={markMarketplaceConflictResolved}>
                            <input type="hidden" name="conflictId" value={conflict.id} />
                            <input type="hidden" name="inventoryId" value={conflict.inventoryId} />
                            <Button type="submit" variant="outline" size="sm" className="w-full">Mark Resolved</Button>
                          </form>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center">
                            {conflict.resolvedBy ? `Resolved by ${conflict.resolvedBy}` : "Resolved"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/marketplace-conflicts?page=${page - 1}&status=${statusParam}&sku=${skuParam}`}>
              <Button variant="outline" size="sm">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/marketplace-conflicts?page=${page + 1}&status=${statusParam}&sku=${skuParam}`}>
              <Button variant="outline" size="sm">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
