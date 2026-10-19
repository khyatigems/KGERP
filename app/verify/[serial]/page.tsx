import type { Metadata } from "next";
import { verifyMultiSerials } from "@/app/erp/packaging/actions";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { VerificationExperience, type VerificationItem } from "@/components/qr-page/verification-experience";

export const metadata: Metadata = {
  title: "Your gemstone | Khyati Gems Product Verification",
  description: "View your Khyati Gems packaging record, gemstone details and available laboratory documentation.",
  robots: { index: false, follow: false },
};

export default async function VerifyPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const ua = headersList.get("user-agent") || "unknown";
  let decodedSerial: string;
  try { decodedSerial = decodeURIComponent(serial); } catch { decodedSerial = serial; }
  const serials = decodedSerial.split(",").map(value => value.trim()).filter(Boolean);
  const [company, verification] = await Promise.all([
    prisma.companySettings.findFirst({ select: { email: true } }),
    verifyMultiSerials(serials, ip, ua),
  ]);
  const items: VerificationItem[] = verification.results.map(result => {
    if (result.isPreview) return { serialNumber: result.serialNumber, status: "preview" };
    if (!result.success || !result.data || result.data.serial.status !== "ACTIVE") return { serialNumber: result.serialNumber, status: "unmatched" };
    const packed = new Date(result.data.serial.packedAt);
    return {
      serialNumber: result.data.serial.serialNumber || result.serialNumber,
      status: "verified",
      packedOn: Number.isNaN(packed.getTime()) ? null : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(packed),
      inventory: result.data.inventory as Record<string, unknown> | null,
    };
  });
  return <VerificationExperience items={items.length ? items : [{ serialNumber: decodedSerial, status: "unmatched" }]} supportEmail={company?.email || "support@khyatigems.com"} />;
}
