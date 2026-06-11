import { verifySerialPublic } from "@/app/erp/packaging/actions";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { computeWeightGrams } from "@/lib/utils";
import { formatInrCurrency, normalizeCertificateUrl } from "@/lib/number-formatting";
import VerificationBanner from "@/components/qr-page/VerificationBanner";
import ProductCard from "@/components/qr-page/ProductCard";
import ProductImage from "@/components/qr-page/ProductImage";
import CertificateCard from "@/components/qr-page/CertificateCard";
import PackagingDetails from "@/components/qr-page/PackagingDetails";
import ContactSupport from "@/components/qr-page/ContactSupport";
import Footer from "@/components/qr-page/Footer";

type VerifyResult = { serial: unknown; inventory: unknown };

function SingleItemView({ result, company, supportEmail }: { result: VerifyResult; company: unknown; supportEmail: string }) {
  const { serial: serialData, inventory } = result as { serial: { status?: string; packedAt?: Date | string; sku?: string | null }; inventory: Record<string, unknown> | null };
  const isCancelled = serialData.status === "CANCELLED";
  const packedOnDate = (() => {
    const v = serialData.packedAt;
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(d);
  })();
  const sku = serialData.sku || null;
  const itemName = (inventory?.itemName as string) || "Product";

  const fields: Array<{ label: string; value: string }> = [];
  if (inventory?.weightValue) {
    const grams = computeWeightGrams(inventory as Parameters<typeof computeWeightGrams>[0]).toFixed(2);
    fields.push({ label: "Weight", value: `${(inventory.weightValue as number).toFixed(2)} ct • ${grams} g` });
  }
  if (inventory?.shape) fields.push({ label: "Shape", value: inventory.shape as string });
  if (inventory?.color) fields.push({ label: "Color", value: inventory.color as string });
  const cutValue = (inventory?.cutGrade as string) || (inventory?.cut as string) || null;
  if (cutValue) fields.push({ label: "Cut", value: cutValue });
  if (inventory?.dimensionsMm) fields.push({ label: "Dimensions", value: `${inventory.dimensionsMm} mm` });
  if (inventory?.transparency) fields.push({ label: "Transparency", value: inventory.transparency as string });
  if (inventory?.treatment) fields.push({ label: "Treatment", value: inventory.treatment as string });

  const certNumber = (inventory?.certificateNo as string) || (inventory?.certificateNumber as string) || null;
  const certAuthority = (inventory?.certificateLab as string) || (inventory?.lab as string) || null;
  const certUrl = normalizeCertificateUrl((inventory?.certificateComments as string) || null);
  const mrp = inventory?.sellingPrice ? formatInrCurrency(inventory.sellingPrice as number) : null;
  const imageUrl = (inventory as unknown as { media?: Array<{ mediaUrl?: string | null }> })?.media?.[0]?.mediaUrl || (inventory?.imageUrl as string) || null;

  return (
    <div className="max-w-[420px] mx-auto space-y-4">
      {isCancelled ? (
        <div className="bg-white rounded-[14px] shadow-sm p-4 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800">Verification unavailable</p>
          <p className="text-xs text-amber-700 mt-1">This item is not active in our system.</p>
        </div>
      ) : (
        <VerificationBanner sku={sku} packedOn={packedOnDate} />
      )}

      <ProductCard name={itemName} fields={fields} />
      {imageUrl && <ProductImage imageUrl={imageUrl} alt={itemName} />}
      <CertificateCard number={certNumber} authority={certAuthority} url={certUrl} />
      <PackagingDetails packedOn={packedOnDate || "-"} mrp={mrp} />
      <ContactSupport email={supportEmail} />
      <Footer website={(company as { website?: string | null })?.website} />
    </div>
  );
}

function MultiItemView({ results, company, supportEmail }: { results: Array<{ serial: string; data: VerifyResult | null; error?: string }>; company: unknown; supportEmail: string }) {
  const website = (company as { website?: string | null })?.website;

  return (
    <div className="max-w-[420px] mx-auto space-y-4">
      <div className="bg-white rounded-[14px] shadow-sm p-4 border border-green-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-green-700">Batch Verified</p>
        </div>
        <p className="text-xs text-green-600">{results.length} items from this batch have been verified.</p>
      </div>

      {results.map((r, idx) => {
        if (!r.data) {
          return (
            <div key={idx} className="bg-white rounded-[14px] shadow-sm p-4 border border-red-100">
              <p className="text-xs text-muted-foreground">Item {idx + 1}</p>
              <div className="font-mono text-sm text-gray-900 break-all">{r.serial}</div>
              <p className="text-xs text-red-600 mt-1">Not found in records</p>
            </div>
          );
        }

        const { serial: serialData, inventory } = r.data as { serial: { status?: string; packedAt?: Date | string; sku?: string | null }; inventory: Record<string, unknown> | null };
        const isCancelled = serialData.status === "CANCELLED";
        const packedOnDate = (() => {
          const v = serialData.packedAt;
          if (!v) return null;
          const d = v instanceof Date ? v : new Date(v);
          if (Number.isNaN(d.getTime())) return null;
          return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
        })();
        const itemName = (inventory?.itemName as string) || "Product";
        const sku = serialData.sku || null;

        const fields: Array<{ label: string; value: string }> = [];
        if (inventory?.weightValue) {
          const grams = computeWeightGrams(inventory as Parameters<typeof computeWeightGrams>[0]).toFixed(2);
          fields.push({ label: "Weight", value: `${(inventory.weightValue as number).toFixed(2)} ct • ${grams} g` });
        }
        if (inventory?.shape) fields.push({ label: "Shape", value: inventory.shape as string });
        if (inventory?.color) fields.push({ label: "Color", value: inventory.color as string });
        const cutValue = (inventory?.cutGrade as string) || (inventory?.cut as string) || null;
        if (cutValue) fields.push({ label: "Cut", value: cutValue });
        if (inventory?.treatment) fields.push({ label: "Treatment", value: inventory.treatment as string });

        const certNumber = (inventory?.certificateNo as string) || (inventory?.certificateNumber as string) || null;
        const certAuthority = (inventory?.certificateLab as string) || (inventory?.lab as string) || null;
        const certUrl = normalizeCertificateUrl((inventory?.certificateComments as string) || null);
        const mrp = inventory?.sellingPrice ? formatInrCurrency(inventory.sellingPrice as number) : null;
        const imageUrl = (inventory as unknown as { media?: Array<{ mediaUrl?: string | null }> })?.media?.[0]?.mediaUrl || (inventory?.imageUrl as string) || null;

        return (
          <div key={idx} className="bg-white rounded-[14px] shadow-sm p-4 border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Item {idx + 1} of {results.length}</p>
              {isCancelled ? (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Cancelled</span>
              ) : (
                <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
              )}
            </div>

            <VerificationBanner sku={sku} packedOn={packedOnDate} />
            <ProductCard name={itemName} fields={fields} />
            {imageUrl && <ProductImage imageUrl={imageUrl} alt={itemName} />}
            <CertificateCard number={certNumber} authority={certAuthority} url={certUrl} />
            <PackagingDetails packedOn={packedOnDate || "-"} mrp={mrp} />
          </div>
        );
      })}

      <ContactSupport email={supportEmail} />
      <Footer website={website} />
    </div>
  );
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const ua = headersList.get("user-agent") || "unknown";

  const company = await prisma.companySettings.findFirst();
  const supportEmail = company?.email || "support@khyatigems.com";

  // Decode URL-encoded characters (e.g. %2C -> ,) then detect multi-item QR
  let decodedSerial: string;
  try { decodedSerial = decodeURIComponent(serial); } catch { decodedSerial = serial; }
  const serials = decodedSerial.split(",").map(s => s.trim()).filter(Boolean);

  if (serials.length > 1) {
    // Multi-item: verify each serial independently
    const results = await Promise.all(
      serials.map(async (s) => {
        try {
          const res = await verifySerialPublic(s, ip, ua);
          return { serial: s, data: res.success ? (res.data ?? null) : null, error: res.success ? undefined : res.message };
        } catch {
          return { serial: s, data: null, error: "Verification failed" };
        }
      })
    );

    const allFailed = results.every(r => !r.data);
    if (allFailed) {
      return (
        <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
          <div className="max-w-[420px] mx-auto space-y-4">
            <div className="bg-white rounded-[14px] shadow-sm p-4 border border-red-100">
              <p className="text-sm font-semibold text-red-700">Unable to verify</p>
              <p className="text-xs text-red-600 mt-1">None of the serial numbers in this batch were found.</p>
              <div className="mt-3 text-xs text-gray-500">Serials</div>
              <div className="font-mono text-sm font-semibold text-gray-900 break-all">{decodedSerial}</div>
            </div>
            <ContactSupport email={supportEmail} />
            <Footer website={company?.website} />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
        <MultiItemView results={results} company={company} supportEmail={supportEmail} />
      </div>
    );
  }

  // Single-item flow (existing)
  const result = await verifySerialPublic(decodedSerial, ip, ua);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
        <div className="max-w-[420px] mx-auto space-y-4">
          <div className="bg-white rounded-[14px] shadow-sm p-4 border border-red-100">
            <p className="text-sm font-semibold text-red-700">Unable to verify</p>
            <p className="text-xs text-red-600 mt-1">This serial number was not found in our records.</p>
            <div className="mt-3 text-xs text-gray-500">Serial</div>
            <div className="font-mono text-sm font-semibold text-gray-900 break-all">{decodedSerial}</div>
          </div>
          <ContactSupport email={supportEmail} />
          <Footer website={company?.website} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
      <SingleItemView result={result.data} company={company} supportEmail={supportEmail} />
    </div>
  );
}
