import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { reconcileInventory } from "@/lib/marketplace/reconciliation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnimatedPage } from "@/components/ui/animated-page";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export const metadata: Metadata = {
  title: "Marketplace Reconciliation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CRITICAL: "destructive",
  WARNING: "secondary",
};

export default async function MarketplaceReconciliationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!await checkUserPermission(session.user.id, PERMISSIONS.LISTINGS_VIEW)) redirect("/");

  const exceptions = await reconcileInventory();

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <WorkspaceHeader eyebrow="KhyatiGems · Marketplaces"><div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Read-only comparison of ERP inventory against marketplace listings, orders and
            fulfillment records. Exceptions are surfaced for review — nothing is auto-corrected.
          </p>
        </div></WorkspaceHeader>

        <Card>
          <CardHeader>
            <CardTitle>{exceptions.length} exception{exceptions.length === 1 ? "" : "s"}</CardTitle>
          </CardHeader>
          <CardContent>
            {exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reconciliation exceptions found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map((e, i) => (
                    <TableRow key={`${e.type}-${e.entityId}-${i}`}>
                      <TableCell>
                        <Badge variant={SEVERITY_VARIANT[e.severity] || "default"}>{e.severity}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.type}</TableCell>
                      <TableCell>{e.sku ?? "-"}</TableCell>
                      <TableCell>{e.marketplace ?? "-"}</TableCell>
                      <TableCell className="text-sm">{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AnimatedPage>
  );
}
