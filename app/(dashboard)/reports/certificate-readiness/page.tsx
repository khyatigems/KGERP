import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ui/export-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type ChecklistRow = {
  id: string;
  sku: string;
  itemName: string;
  missingFields: string[];
  isReady: boolean;
  hasCertificate: boolean;
};

const checklistFieldOrder = [
  "Species",
  "Variety",
  "Color",
  "Weight",
  "Shape",
  "Measurements",
  "Origin",
  "Treatments",
  "Fluorescence",
  "Images"
];

export default async function CertificateReadinessReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/");
  }

  const inventory = await prisma.inventory.findMany({
    where: {
      status: "IN_STOCK"
    },
    select: {
      id: true,
      sku: true,
      itemName: true,
      gemType: true,
      color: true,
      weightValue: true,
      carats: true,
      shape: true,
      cut: true,
      measurements: true,
      dimensionsMm: true,
      origin: true,
      treatment: true,
      fluorescence: true,
      certificateNo: true,
      lab: true,
      certification: true,
      imageUrl: true,
      categoryCode: { select: { name: true } },
      gemstoneCode: { select: { name: true } },
      colorCode: { select: { name: true } },
      media: {
        where: { type: { in: ["IMAGE", "image"] } },
        select: { id: true }
      }
    },
    orderBy: { sku: "asc" }
  });

  const rows: ChecklistRow[] = inventory.map((item) => {
    const speciesField = item.gemstoneCode?.name || item.gemType || "";
    const varietyField = item.gemType || item.categoryCode?.name || "";
    const colorField = item.color || item.colorCode?.name || "";
    const weightField = item.weightValue || item.carats || 0;
    const shapeField = item.shape || item.cut || "";
    const measurementsField = item.measurements || item.dimensionsMm || "";
    const originField = item.origin || "";
    const treatmentField = item.treatment || "";
    const fluorescenceField = item.fluorescence || "";
    const hasImages = item.media.length > 0 || Boolean(item.imageUrl);

    const missingFields: string[] = [];
    if (!speciesField) missingFields.push("Species");
    if (!varietyField) missingFields.push("Variety");
    if (!colorField) missingFields.push("Color");
    if (!weightField || weightField <= 0) missingFields.push("Weight");
    if (!shapeField) missingFields.push("Shape");
    if (!measurementsField) missingFields.push("Measurements");
    if (!originField) missingFields.push("Origin");
    if (!treatmentField) missingFields.push("Treatments");
    if (!fluorescenceField) missingFields.push("Fluorescence");
    if (!hasImages) missingFields.push("Images");

    return {
      id: item.id,
      sku: item.sku,
      itemName: item.itemName,
      missingFields,
      isReady: missingFields.length === 0,
      hasCertificate: Boolean(item.certificateNo || item.certification || item.lab)
    };
  });

  const totalSkus = rows.length;
  const readySkus = rows.filter((row) => row.isReady).length;
  const pendingSkus = totalSkus - readySkus;
  const alreadyCertified = rows.filter((row) => row.hasCertificate).length;

  const exportData = rows.map((row) => {
    const missingSet = new Set(row.missingFields);
    const fieldFlags = checklistFieldOrder.reduce<Record<string, string>>((acc, field) => {
      acc[field] = missingSet.has(field) ? "Missing" : "Available";
      return acc;
    }, {});
    return {
      SKU: row.sku,
      "Item Name": row.itemName,
      "Certificate Ready": row.isReady ? "Yes" : "No",
      "Has Certificate": row.hasCertificate ? "Yes" : "No",
      "Missing Count": row.missingFields.length,
      "Missing Fields": row.missingFields.join(", ") || "None",
      ...fieldFlags
    };
  });

  const exportColumns = [
    { header: "SKU", key: "SKU" },
    { header: "Item Name", key: "Item Name" },
    { header: "Certificate Ready", key: "Certificate Ready" },
    { header: "Has Certificate", key: "Has Certificate" },
    { header: "Missing Count", key: "Missing Count" },
    { header: "Missing Fields", key: "Missing Fields" },
    ...checklistFieldOrder.map((field) => ({ header: field, key: field }))
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Certificate Checklist Report</h2>
        <ExportButton
          filename={`Certificate_Checklist_Report_${format(new Date(), "yyyyMMdd")}`}
          data={exportData}
          columns={exportColumns}
          title="Certificate Readiness Checklist"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkus}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready for Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{readySkus}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Need Data Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{pendingSkus}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Already Certified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{alreadyCertified}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Checklist Status</TableHead>
              <TableHead>Missing Fields</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No inventory found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.sku}</TableCell>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>
                    {row.isReady ? (
                      <Badge className="bg-green-600 hover:bg-green-600">Ready</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.missingFields.length > 0 ? row.missingFields.join(", ") : "None"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
