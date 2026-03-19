import { verifySerialPublic } from "@/app/erp/packaging/actions";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { computeWeightGrams } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default async function VerifyPage({
  params,
}: {
  params: { serial: string };
}) {
  const { serial } = params;
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const ua = headersList.get("user-agent") || "unknown";

  const result = await verifySerialPublic(serial, ip, ua);
  const company = await prisma.companySettings.findFirst();

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 space-y-6">
          <Card className="border-red-200 bg-red-50/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg text-red-700">Unable to verify</CardTitle>
              <div className="text-sm text-red-600">This serial number was not found in our records.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-white/70 border border-red-100 p-3">
                <div className="text-xs text-red-600 uppercase tracking-wider">Serial</div>
                <div className="mt-1 font-mono text-base font-semibold text-red-800">{serial}</div>
              </div>
              <div className="text-sm text-muted-foreground">Need help? Contact Support below.</div>
              {company?.email && (
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${company.email}`}>Email Support</a>
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <div>{company?.website || "khyatigems.com"}</div>
            <div>Original Product</div>
          </div>
        </div>
      </div>
    );
  }

  const { serial: serialData, inventory } = result.data;
  const isVoid = serialData.status === "CANCELLED";
  const packedOn = serialData.packedAt ? format(new Date(serialData.packedAt), "dd MMM yyyy") : "-";
  const sku = serialData.sku || "-";
  const itemName = inventory?.itemName || "-";

  const weightCt = inventory?.weightValue ? `${inventory.weightValue.toFixed(2)} ct` : null;
  const weightGrams = inventory ? `${computeWeightGrams(inventory).toFixed(2)} g` : null;
  const certRaw = inventory?.certificateNo || (inventory as any)?.certificateNumber || null;
  const certIsUrl = !!certRaw && (String(certRaw).startsWith("http://") || String(certRaw).startsWith("https://") || String(certRaw).startsWith("www."));
  const certUrl = certIsUrl ? String(certRaw).replace(/^www\./, "https://www.") : null;
  const certNumber = !certIsUrl && certRaw ? String(certRaw) : null;
  const certAuthority = (inventory as any)?.certificateLab || inventory?.lab || null;

  const mrp = inventory?.sellingPrice
    ? `₹${Number(inventory.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  const showField = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "-";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 space-y-6">
        <div className={`rounded-xl border px-4 py-4 ${isVoid ? "border-red-200 bg-red-50/60" : "border-emerald-200 bg-emerald-50/60"}`}>
          <div className="flex items-start gap-3">
            {isVoid ? (
              <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-emerald-600 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className={`text-base font-semibold ${isVoid ? "text-red-700" : "text-emerald-700"}`}>
                {isVoid ? "Product Flagged" : "Product Verified by Khyati Gems"}
              </div>
              <div className="text-xs text-muted-foreground">This item is securely recorded in our system</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white/70">{sku}</Badge>
                <Badge variant="outline" className="bg-white/70">Packed {packedOn}</Badge>
                <Badge variant="outline" className="bg-white/70 font-mono">{serialData.serialNumber}</Badge>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Product Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Item Name</div>
                <div className="text-base font-semibold text-foreground">{itemName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Weight</div>
                <div className="text-base font-semibold text-foreground">
                  {[weightCt, weightGrams].filter(Boolean).join(" • ") || "-"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {showField(inventory?.shape) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Shape</span>
                  <span className="text-sm font-semibold text-foreground">{inventory?.shape}</span>
                </div>
              )}
              {showField(inventory?.color) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <span className="text-sm font-semibold text-foreground">{inventory?.color}</span>
                </div>
              )}
              {showField((inventory as any)?.cutGrade || inventory?.cut) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Cut</span>
                  <span className="text-sm font-semibold text-foreground">{(inventory as any)?.cutGrade || inventory?.cut}</span>
                </div>
              )}
              {showField(inventory?.dimensionsMm) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Dimensions</span>
                  <span className="text-sm font-semibold text-foreground">{inventory?.dimensionsMm} mm</span>
                </div>
              )}
              {showField(inventory?.transparency) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Transparency</span>
                  <span className="text-sm font-semibold text-foreground">{inventory?.transparency}</span>
                </div>
              )}
              {showField(inventory?.treatment) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Treatment</span>
                  <span className="text-sm font-semibold text-foreground">{inventory?.treatment}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {inventory?.imageUrl && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inventory.imageUrl}
                alt={itemName}
                className="w-full rounded-xl border bg-white object-contain"
                loading="lazy"
              />
            </CardContent>
          </Card>
        )}

        {(certNumber || certUrl) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Certification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {certNumber && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Certificate Number</span>
                  <span className="text-sm font-semibold text-foreground">{certNumber}</span>
                </div>
              )}
              {showField(certAuthority) && (
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground">Certification Authority</span>
                  <span className="text-sm font-semibold text-foreground">{String(certAuthority)}</span>
                </div>
              )}
              {certUrl && (
                <Button asChild className="w-full rounded-lg">
                  <a href={certUrl} target="_blank" rel="noopener noreferrer">View Certificate</a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Packaging Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <span className="text-xs text-muted-foreground">Packed On</span>
              <span className="text-sm font-semibold text-foreground">{packedOn}</span>
            </div>
            {mrp && (
              <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                <span className="text-xs text-muted-foreground">MRP (Incl. taxes)</span>
                <span className="text-sm font-semibold text-foreground">{mrp}</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <span className="text-xs text-muted-foreground">Country</span>
              <span className="text-sm font-semibold text-foreground">India</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
              <span className="text-xs text-muted-foreground">SKU</span>
              <span className="text-sm font-semibold text-foreground font-mono">{sku}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Need help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company?.email && (
              <Button asChild variant="outline" className="w-full">
                <a href={`mailto:${company.email}`}>Contact Support</a>
              </Button>
            )}
            {company?.phone && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="flex-1 min-w-[140px]">
                  <a href={`tel:${company.phone}`}>Call</a>
                </Button>
                <Button asChild variant="outline" className="flex-1 min-w-[140px]">
                  <Link href={`https://wa.me/${company.phone.replace(/\D/g, "")}`} target="_blank">WhatsApp</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <div>{company?.website || "khyatigems.com"}</div>
          <div>Original Product</div>
        </div>
      </div>
    </div>
  );
}
