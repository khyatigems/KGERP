import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Vendor Details | KhyatiGems™",
};

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user.role, PERMISSIONS.VENDOR_VIEW)) {
    redirect("/");
  }

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
  });

  if (!vendor) {
    notFound();
  }

  // Get related inventory and purchases
  const [inventoryCount, purchaseCount, recentInventory] = await Promise.all([
    prisma.inventory.count({ where: { vendorId: id } }),
    prisma.purchase.count({ where: { vendorId: id } }),
    prisma.inventory.findMany({
      where: { vendorId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        sku: true,
        itemName: true,
        status: true,
        costPrice: true,
        createdAt: true,
      },
    }),
  ]);

  const canManage = hasPermission(session.user.role, PERMISSIONS.VENDOR_MANAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Vendors
            </Link>
          </Button>
        </div>
        {canManage && (
          <Button size="sm" asChild>
            <Link href={`/vendors/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Vendor
            </Link>
          </Button>
        )}
      </div>

      {/* Vendor Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{vendor.name}</CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  variant={
                    vendor.status === "APPROVED"
                      ? "default"
                      : vendor.status === "BLOCKED"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {vendor.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {vendor.vendorType || "Vendor"}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="space-y-2 text-sm">
              {vendor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                    {vendor.email}
                  </a>
                </div>
              )}
              {(vendor.address || vendor.city || vendor.state || vendor.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    {[
                      vendor.address,
                      vendor.city,
                      vendor.state,
                      vendor.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{inventoryCount}</div>
                <div className="text-xs text-muted-foreground">Inventory Items</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{purchaseCount}</div>
                <div className="text-xs text-muted-foreground">Purchases</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Member since {formatDate(vendor.createdAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Inventory */}
      {recentInventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentInventory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.itemName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {item.sku} • {formatDate(item.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        item.status === "IN_STOCK"
                          ? "default"
                          : item.status === "SOLD"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {item.status}
                    </Badge>
                    {item.costPrice && (
                      <div className="text-sm font-medium">
                        {formatCurrency(item.costPrice)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {inventoryCount > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/inventory?vendorId=${id}`}>
                    View all {inventoryCount} items
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {vendor.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
