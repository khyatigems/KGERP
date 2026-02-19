import { verifySerialPublic } from "@/app/erp/packaging/actions";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

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

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-50 via-slate-50 to-white">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14 space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Khyati Gems™</div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Serial Verification</h1>
            <p className="text-sm text-muted-foreground">Authenticity check for serialized packaging</p>
          </div>

          <Card className="border-red-200 shadow-xl">
            <CardHeader className="bg-red-50 border-b border-red-100 text-center pb-6">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-red-700">Invalid Serial Number</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 text-sm">
                <div className="text-xs uppercase tracking-wider text-red-600">Serial</div>
                <div className="mt-1 font-mono text-lg font-semibold text-red-700">{serial}</div>
              </div>
              <p className="text-sm text-muted-foreground">
                This serial number could not be verified in our records.
              </p>
              <div className="bg-yellow-50 p-4 rounded-md text-sm text-yellow-800 border border-yellow-200">
                Please contact Khyati Gems support if you believe this is an error.
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Khyati Precious Gems Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  const { serial: serialData, inventory } = result.data;
  const isVoid = serialData.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-slate-50 to-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14 space-y-8">
        <div className="text-center space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Khyati Gems™</div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Serial Verification</h1>
          <p className="text-sm text-muted-foreground">Authenticity check for serialized packaging</p>
        </div>

        <Card className={`shadow-xl ${isVoid ? "border-red-200" : "border-emerald-200"}`}>
          <CardHeader className={`rounded-t-md ${isVoid ? "bg-red-50" : "bg-emerald-50"}`}>
            <div className="flex flex-col items-center text-center gap-2">
              {isVoid ? (
                <AlertTriangle className="w-16 h-16 text-red-500" />
              ) : (
                <ShieldCheck className="w-16 h-16 text-emerald-500" />
              )}
              <CardTitle className={`text-2xl ${isVoid ? "text-red-600" : "text-emerald-600"}`}>
                {isVoid ? "VOID / CANCELLED" : "Authentic Product"}
              </CardTitle>
              {isVoid ? (
                <Badge variant="destructive">This item has been flagged</Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Verified Authentic
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Serial Number</div>
                <div className="font-mono text-lg font-semibold text-gray-900">{serialData.serialNumber}</div>
                <Badge variant="secondary" className="w-fit">Status: {serialData.status}</Badge>
              </div>
              <div className="rounded-lg border bg-white p-4 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">SKU</div>
                <div className="font-mono text-lg font-semibold text-gray-900">{serialData.sku}</div>
                <div className="text-xs text-muted-foreground">Packaged {format(new Date(serialData.packedAt), "MMM d, yyyy")}</div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Product Details</div>
                <h3 className="text-lg font-semibold text-gray-900">{inventory?.itemName}</h3>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{inventory?.gemType || "-"}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-medium text-foreground">
                    {inventory?.weightValue} {inventory?.weightUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-muted-foreground">Shape</span>
                  <span className="font-medium text-foreground">{inventory?.shape || "-"}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                  <span className="text-muted-foreground">Certificate</span>
                  <span className="font-medium text-foreground">{inventory?.certificateNo || "-"}</span>
                </div>
              </div>

              {inventory?.certificateNo && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                  <ShieldCheck className="w-4 h-4" />
                  Certified by {inventory.lab || "Lab"} ({inventory.certificateNo})
                </div>
              )}
            </div>

            <div className="pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>Verification ID: {serialData.id.substring(0, 8)}...</span>
              <span>Scan logged</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Khyati Precious Gems Pvt. Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
