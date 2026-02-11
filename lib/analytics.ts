import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function trackPublicView(
  entityType: "SKU_VIEW" | "INVOICE_VIEW",
  entityId: string, // The DB ID or Unique Identifier (SKU/Token)
  entityIdentifier: string, // Human readable ID (SKU/Invoice Number)
  searchParams: Record<string, string | string[] | undefined>
) {
  try {
    const session = await auth();
    const source = searchParams?.source;
    const isQrScan = source === "qr";
    const actionType = isQrScan ? "QR_SCAN" : "PUBLIC_VIEW";

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "Unknown";
    const forwardedFor = headersList.get("x-forwarded-for");
    const ipAddress = forwardedFor 
      ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]) 
      : "Unknown";

    // Simple Browser/OS detection
    let browser = "Unknown Browser";
    if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("SamsungBrowser")) browser = "Samsung Browser";
    else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";
    else if (userAgent.includes("Trident")) browser = "Internet Explorer";
    else if (userAgent.includes("Edge")) browser = "Edge";
    else if (userAgent.includes("Chrome")) browser = "Chrome";
    else if (userAgent.includes("Safari")) browser = "Safari";

    let os = "Unknown OS";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Mac OS")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    // Create log entry
    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        entityIdentifier,
        actionType,
        ipAddress: ipAddress.trim(),
        userAgent: userAgent.substring(0, 500),
        source: isQrScan ? "QR Code" : "Direct Link",
        userId: session?.user?.id,
        userName: session?.user?.name,
        userEmail: session?.user?.email,
        details: JSON.stringify({ 
          sourceParam: source,
          browser,
          os,
          isStaff: !!session?.user,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error) {
    console.error("Failed to track public view:", error);
  }
}
