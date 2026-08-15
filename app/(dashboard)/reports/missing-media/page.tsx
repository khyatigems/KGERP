import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ui/export-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { AnimatedPage } from "@/components/ui/animated-page";
import { CheckCircle2, ImageOff, FileX2 } from "lucide-react";
import { cachedMasters } from "@/lib/cache";
import { ReportMultiFilter } from "@/components/reports/missing-media-filters";
import type { Prisma } from "@prisma/client";

function parseMulti(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

type MissingMediaRow = {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  gemType: string;
  color: string;
  weightValue: number | null;
  sellingPrice: number | null;
  noImage: boolean;
  noCertificate: boolean;
};

export default async function MissingMediaReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/");
  }

  const sp = await searchParams;
  const categories = parseMulti(sp.category).filter((v) => v !== "ALL");
  const gemTypes = parseMulti(sp.gemType).filter((v) => v !== "ALL");
  const colors = parseMulti(sp.color).filter((v) => v !== "ALL");

  const and: Prisma.InventoryWhereInput[] = [{ status: "IN_STOCK" }];

  if (categories.length > 0) {
    and.push({
      OR: [
        { category: { in: categories } },
        { categoryCode: { is: { name: { in: categories } } } },
      ],
    });
  }

  if (gemTypes.length > 0) {
    and.push({
      OR: [
        { gemType: { in: gemTypes } },
        { gemstoneCode: { is: { name: { in: gemTypes } } } },
      ],
    });
  }

  if (colors.length > 0) {
    and.push({
      OR: [
        { color: { in: colors } },
        { colorCodeId: { in: colors } },
        { colorCode: { is: { name: { in: colors } } } },
      ],
    });
  }

  const where: Prisma.InventoryWhereInput = and.length ? { AND: and } : {};

  const inventory = await prisma.inventory.findMany({
    where,
    select: {
      id: true,
      sku: true,
      itemName: true,
      gemType: true,
      color: true,
      category: true,
      weightValue: true,
      sellingPrice: true,
      certificateNo: true,
      certificateNumber: true,
      imageUrl: true,
      categoryCode: { select: { name: true } },
      gemstoneCode: { select: { name: true } },
      colorCode: { select: { name: true } },
      media: {
        where: { type: { in: ["IMAGE", "image"] } },
        select: { id: true },
      },
    },
    orderBy: { sku: "asc" },
  });

  const rows: MissingMediaRow[] = inventory.map((item) => {
    const noImage =
      !item.imageUrl &&
      (!item.media || item.media.length === 0);
    const noCertificate =
      (!item.certificateNo || !item.certificateNo.trim()) &&
      (!item.certificateNumber || !item.certificateNumber.trim());

    return {
      id: item.id,
      sku: item.sku,
      itemName: item.itemName,
      category: item.categoryCode?.name || item.category || "",
      gemType: item.gemstoneCode?.name || item.gemType || "",
      color: item.colorCode?.name || item.color || "",
      weightValue: item.weightValue,
      sellingPrice: item.sellingPrice,
      noImage,
      noCertificate,
    };
  });

  const filteredRows = rows.filter((row) => row.noImage || row.noCertificate);

  const totalSkus = rows.length;
  const missingImageSkus = filteredRows.filter((row) => row.noImage).length;
  const missingCertificateSkus = filteredRows.filter((row) => row.noCertificate).length;
  const missingBothSkus = filteredRows.filter((row) => row.noImage && row.noCertificate).length;

  const exportData = filteredRows.map((row) => ({
    SKU: row.sku,
    "Item Name": row.itemName,
    Category: row.category,
    "Gem Type": row.gemType,
    Color: row.color,
    "Weight (cts)": row.weightValue ?? "",
    "Selling Price": row.sellingPrice ?? "",
    "Image Status": row.noImage ? "Missing" : "Available",
    "Certificate Status": row.noCertificate ? "Missing" : "Available",
  }));

  const exportColumns = [
    { header: "SKU", key: "SKU" },
    { header: "Item Name", key: "Item Name" },
    { header: "Category", key: "Category" },
    { header: "Gem Type", key: "Gem Type" },
    { header: "Color", key: "Color" },
    { header: "Weight (cts)", key: "Weight (cts)" },
    { header: "Selling Price", key: "Selling Price" },
    { header: "Image Status", key: "Image Status" },
    { header: "Certificate Status", key: "Certificate Status" },
  ];

  const [categoriesMaster, gemstonesMaster, colorsMaster] = await Promise.all([
    cachedMasters.getCategories(prisma)(),
    cachedMasters.getGemstones(prisma)(),
    cachedMasters.getColors(prisma)(),
  ]);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Missing Image & Certificate Report</h2>
            <p className="text-sm text-muted-foreground">
              SKUs pending image or certificate across category, gem type, and color.
            </p>
          </div>
          <ExportButton
            filename={`Missing_Media_Certificate_Report_${format(new Date(), "yyyyMMdd")}`}
            data={exportData}
            columns={exportColumns}
            title="Missing Image & Certificate Report"
          />
        </div>

        <div className="bg-card p-4 rounded-md border">
          <ReportMultiFilter
            categories={categoriesMaster.map((c) => ({ id: c.id, name: c.name }))}
            gemstones={gemstonesMaster.map((g) => ({ id: g.id, name: g.name }))}
            colors={colorsMaster.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total IN_STOCK SKUs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSkus}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ImageOff className="h-4 w-4 text-red-600" /> Missing Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{missingImageSkus}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileX2 className="h-4 w-4 text-amber-600" /> Missing Certificate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{missingCertificateSkus}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Missing Both</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{missingBothSkus}</div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Gem Type</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Image Status</TableHead>
                <TableHead>Certificate Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    No SKUs are missing an image or certificate.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono">{row.sku}</TableCell>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>{row.category || "-"}</TableCell>
                    <TableCell>{row.gemType || "-"}</TableCell>
                    <TableCell>{row.color || "-"}</TableCell>
                    <TableCell>
                      {row.noImage ? (
                        <Badge variant="destructive" className="gap-1">
                          <ImageOff className="h-3 w-3" /> No Image
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                          <CheckCircle2 className="h-3 w-3" /> Available
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.noCertificate ? (
                        <Badge variant="destructive" className="gap-1">
                          <FileX2 className="h-3 w-3" /> No Certificate
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
                          <CheckCircle2 className="h-3 w-3" /> Available
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AnimatedPage>
  );
}