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
  const supportEmail = company?.email || "support@khyatigems.com";

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
        <div className="max-w-[420px] mx-auto space-y-4">
          <div className="bg-white rounded-[14px] shadow-sm p-4 border border-red-100">
            <p className="text-sm font-semibold text-red-700">Unable to verify</p>
            <p className="text-xs text-red-600 mt-1">This serial number was not found in our records.</p>
            <div className="mt-3 text-xs text-gray-500">Serial</div>
            <div className="font-mono text-sm font-semibold text-gray-900 break-all">{serial}</div>
          </div>
          <ContactSupport email={supportEmail} />
          <Footer website={company?.website} />
        </div>
      </div>
    );
  }

  const { serial: serialData, inventory } = result.data;
  const isCancelled = serialData.status === "CANCELLED";
  const packedOnDate = (() => {
    const v = serialData.packedAt;
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  })();
  const sku = serialData.sku || null;
  const itemName = inventory?.itemName || "Product";

  const fields: Array<{ label: string; value: string }> = [];
  if (inventory?.weightValue) {
    const grams = computeWeightGrams(inventory).toFixed(2);
    fields.push({ label: "Weight", value: `${inventory.weightValue.toFixed(2)} ct • ${grams} g` });
  }
  if (inventory?.shape) fields.push({ label: "Shape", value: inventory.shape });
  if (inventory?.color) fields.push({ label: "Color", value: inventory.color });
  const cutValue = inventory?.cutGrade || inventory?.cut || null;
  if (cutValue) fields.push({ label: "Cut", value: cutValue });
  if (inventory?.dimensionsMm) fields.push({ label: "Dimensions", value: `${inventory.dimensionsMm} mm` });
  if (inventory?.transparency) fields.push({ label: "Transparency", value: inventory.transparency });
  if (inventory?.treatment) fields.push({ label: "Treatment", value: inventory.treatment });

  const certNumber = inventory?.certificateNo || null;
  const certAuthority = inventory?.certificateLab || inventory?.lab || null;
  const certUrl = normalizeCertificateUrl(inventory?.certificateComments || null);
  const mrp = inventory?.sellingPrice ? formatInrCurrency(inventory.sellingPrice) : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 py-6">
      <div className="max-w-[420px] mx-auto space-y-4">
        {isCancelled ? (
          <div className="bg-white rounded-[14px] shadow-sm p-4 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">Verification unavailable</p>
            <p className="text-xs text-amber-700 mt-1">This item is not active in our system.</p>
          </div>
        ) : (
          <VerificationBanner sku={sku} packedOn={packedOnDate} />
        )}

        <ProductCard
          name={itemName}
          fields={fields}
        />

        {inventory?.imageUrl && <ProductImage imageUrl={inventory.imageUrl} alt={itemName} />}

        <CertificateCard
          number={certNumber}
          authority={certAuthority}
          url={certUrl}
        />

        <PackagingDetails packedOn={packedOnDate || "-"} mrp={mrp} />

        <ContactSupport email={supportEmail} />

        <Footer website={company?.website} />
      </div>
    </div>
  );
}
