import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function trackPublicView(
  entityType: "SKU_VIEW" | "INVOICE_VIEW",
  entityId: string, // The DB ID or Unique Identifier (SKU/Token)
  entityIdentifier: string, // Human readable ID (SKU/Invoice Number)
  searchParams: Record<string, string | string[] | undefined>
) {
  try {
    const source = searchParams?.source;
    const isQrScan = source === "qr";
    const actionType = isQrScan ? "QR_SCAN" : "PUBLIC_VIEW";

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "Unknown";
    const forwardedFor = headersList.get("x-forwarded-for");
    const ipAddress = forwardedFor 
      ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]) 
      : "Unknown";

    // Create log entry
    await prisma.activityLog.create({
      data: {
        entityType,
        entityId, // Can be the SKU string or Invoice Token if UUID not available handy
        entityIdentifier,
        actionType,
        ipAddress: ipAddress.trim(),
        userAgent: userAgent.substring(0, 500), // Truncate if too long
        source: isQrScan ? "QR Code" : "Direct Link",
        details: JSON.stringify({ 
          sourceParam: source,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error) {
    // Fail silently to not block the user view
    console.error("Failed to track public view:", error);
  }
}
