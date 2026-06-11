import { verifyMultiSerials } from "@/app/erp/packaging/actions";
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

type ItemResult = {
  serialNumber: string;
  verified: boolean;
  isPreview: boolean;
    inventory?: Record<string, unknown> | null;
  packedOn?: string | null;
};

function buildSerialFields(inv: Record<string, unknown>) {
  const fields: Array<{ label: string; value: string }> = [];
  const weightValue = inv.weightValue as number | undefined;
  if (weightValue) {
    const g = computeWeightGrams(inv).toFixed(2);
    fields.push({ label: "Weight", value: `${weightValue.toFixed(2)} ct • ${g} g` });
  }
  const shape = inv.shape as string | undefined;
  if (shape) fields.push({ label: "Shape", value: shape });
  const color = inv.color as string | undefined;
  if (color) fields.push({ label: "Color", value: color });
  const cutValue = (inv.cutGrade as string) || (inv.cut as string) || null;
  if (cutValue) fields.push({ label: "Cut", value: cutValue });
  const dims = inv.dimensionsMm as string | undefined;
  if (dims) fields.push({ label: "Dimensions", value: `${dims} mm` });
  const transparency = inv.transparency as string | undefined;
  if (transparency) fields.push({ label: "Transparency", value: transparency });
  const treatment = inv.treatment as string | undefined;
  if (treatment) fields.push({ label: "Treatment", value: treatment });
  return fields;
}

function PreviewCard({ serialNumber }: { serialNumber: string }) {
  return (
    <div className="bg-white rounded-[14px] shadow-sm p-4 border border-dashed border-amber-300">
      <div className="flex items-start gap-2">
        <span className="text-amber-500 text-sm mt-0.5">&#9888;</span>
        <div>
          <h2 className="text-sm font-semibold text-amber-800">Preview Item</h2>
          <p className="text-xs text-amber-600 mt-0.5">
            This item was generated in preview mode. Actual product data will appear once printed.
          </p>
          <p className="text-[11px] text-gray-400 font-mono mt-2">{serialNumber}</p>
        </div>
      </div>
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

  let decodedSerial: string;
  try { decodedSerial = decodeURIComponent(serial); } catch { decodedSerial = serial; }

  const serials = decodedSerial.split(",").map(s => s.trim()).filter(Boolean);
  const isMulti = serials.length > 1;

  const company = await prisma.companySettings.findFirst();
  const supportEmail = company?.email || "support@khyatigems.com";

  const { results } = await verifyMultiSerials(serials, ip, ua);

  const items: ItemResult[] = results.map(r => {
    if (r.isPreview) {
      return { serialNumber: r.serialNumber, verified: false, isPreview: true, inventory: null, packedOn: null };
    }
    if (!r.success || !r.data) {
      return { serialNumber: r.serialNumber, verified: false, isPreview: false, inventory: null, packedOn: null };
    }
    const inv = r.data.inventory as Record<string, unknown> | null;
    const serialRow = r.data.serial;
    const packedOn = (() => {
      const v = serialRow.packedAt;
      if (!v) return null;
      const d = v instanceof Date ? v : new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
    })();

    const mediaArr = (inv as unknown as { media?: Array<{ mediaUrl?: string | null }> })?.media;
    const imageUrl = mediaArr?.[0]?.mediaUrl || (inv?.imageUrl as string | null) || null;

    return {
      serialNumber: r.serialNumber,
      verified: true,
      isPreview: false,
      packedOn,
      inventory: inv,
    };
  });

  const verifiedItems = items.filter(i => i.verified);
  const previewItems = items.filter(i => i.isPreview);
  const anyVerified = verifiedItems.length > 0;

  if (!anyVerified && previewItems.length === 0) {
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

  if (!anyVerified && previewItems.length > 0) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
        <div className="max-w-[420px] mx-auto space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-[14px] shadow-sm p-4">
            <p className="text-sm font-semibold text-amber-800">Preview Label</p>
            <p className="text-xs text-amber-600 mt-1">
              This label was generated in preview mode. Scan the QR code on the final printed label for verification.
            </p>
          </div>
          {isMulti && (
            <p className="text-xs text-gray-500 text-center">
              {items.length} item{items.length > 1 ? "s" : ""} on this label
            </p>
          )}
          {previewItems.map(item => (
            <PreviewCard key={item.serialNumber} serialNumber={item.serialNumber} />
          ))}
          <ContactSupport email={supportEmail} />
          <Footer website={company?.website} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
      <div className="max-w-[420px] mx-auto space-y-4">
        {isMulti && (
          <p className="text-sm text-gray-600 text-center font-medium">
            {verifiedItems.length} verified item{verifiedItems.length > 1 ? "s" : ""}
            {previewItems.length > 0 ? ` + ${previewItems.length} preview` : ""} on this label
          </p>
        )}

        {verifiedItems.map((item, idx) => {
          const inv = item.inventory as Record<string, unknown>;
          const itemName = (inv?.itemName as string) || "Product";
          const sku = (inv?.sku as string) || null;
          const sellingPrice = inv?.sellingPrice as number | undefined;
          const mrp = sellingPrice ? formatInrCurrency(sellingPrice) : null;
          const certNumber = (inv?.certificateNo as string) || (inv?.certificateNumber as string) || null;
          const certAuthority = (inv?.certificateLab as string) || (inv?.lab as string) || null;
          const certComments = inv?.certificateComments as string | null;
          const certUrl = normalizeCertificateUrl(certComments);
          const imageUrl = (inv?.imageUrl as string) || null;

          return (
            <div key={item.serialNumber} className={isMulti ? "border-b border-gray-100 pb-4 last:border-0 last:pb-0" : ""}>
              <VerificationBanner sku={sku} packedOn={item.packedOn} />
              <div className="mt-4">
                <ProductCard name={itemName} fields={buildSerialFields(inv)} />
              </div>
              {imageUrl && (
                <div className="mt-4">
                  <ProductImage imageUrl={imageUrl} alt={itemName} />
                </div>
              )}
              <div className="mt-4">
                <CertificateCard number={certNumber} authority={certAuthority} url={certUrl} />
              </div>
              <div className="mt-4">
                <PackagingDetails packedOn={item.packedOn || "-"} mrp={mrp} />
              </div>
            </div>
          );
        })}

        {previewItems.map(item => (
          <div key={item.serialNumber} className="mt-4">
            <PreviewCard serialNumber={item.serialNumber} />
          </div>
        ))}

        <ContactSupport email={supportEmail} />
        <Footer website={company?.website} />
      </div>
    </div>
  );
}
