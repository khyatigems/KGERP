import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/settings/export
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.companySettings.findFirst();
    
    return NextResponse.json({
      enableExportInvoice: settings?.enableExportInvoice ?? true,
      defaultExportType: settings?.defaultExportType ?? "LUT",
      companyIec: settings?.companyIec ?? "",
      defaultCurrency: settings?.defaultCurrency ?? "USD",
      defaultPort: settings?.defaultPort ?? "IGI Airport, New Delhi",
      swiftCode: settings?.swiftCode ?? "RATNINBBXXX",
    });
  } catch (error) {
    console.error("Failed to fetch export settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch export settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings/export
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Ensure CompanySettings exists
    const existing = await prisma.companySettings.findFirst();
    
    if (existing) {
      await prisma.companySettings.update({
        where: { id: existing.id },
        data: {
          enableExportInvoice: body.enableExportInvoice,
          defaultExportType: body.defaultExportType,
          companyIec: body.companyIec,
          defaultCurrency: body.defaultCurrency,
          defaultPort: body.defaultPort,
          swiftCode: (body.swiftCode || "RATNINBBXXX").toUpperCase(),
        },
      });
    } else {
      // Get or create default company settings
      const defaultSettings = await prisma.companySettings.findFirst();
      const companyName = defaultSettings?.companyName ?? "Khyati Gems";
      
      await prisma.companySettings.create({
        data: {
          companyName,
          enableExportInvoice: body.enableExportInvoice ?? true,
          defaultExportType: body.defaultExportType ?? "LUT",
          companyIec: body.companyIec ?? "",
          defaultCurrency: body.defaultCurrency ?? "USD",
          defaultPort: body.defaultPort ?? "IGI Airport, New Delhi",
          swiftCode: (body.swiftCode || "RATNINBBXXX").toUpperCase(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save export settings:", error);
    return NextResponse.json(
      { error: "Failed to save export settings" },
      { status: 500 }
    );
  }
}
